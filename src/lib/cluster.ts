import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import {
  CLUSTERING_SYSTEM,
  renderClusteringPrompt,
  type ExistingTheme,
  type NewPoint,
} from "@/lib/prompts/clustering";
import { createAdmin } from "@/lib/supabase/admin";

const ResponseSchema = z.object({
  new_themes: z
    .array(
      z.object({
        temp_id: z.string(),
        short_name: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  assignments: z.array(
    z.object({ point_id: z.string(), theme_ids: z.array(z.string()).default([]) }),
  ),
});

export async function clusterParticipantPoints(participantId: string) {
  const admin = createAdmin();

  const { data: participant, error: pErr } = await admin
    .from("participants")
    .select("id, session_id")
    .eq("id", participantId)
    .single();
  if (pErr || !participant) throw new Error(`participant not found`);

  const { data: session } = await admin
    .from("sessions")
    .select("question")
    .eq("id", participant.session_id)
    .single();
  if (!session) throw new Error(`session not found`);

  const { data: existingAssignments } = await admin
    .from("theme_assignments")
    .select("point_id, theme_id, themes:theme_id(id, session_id)")
    .in(
      "point_id",
      (
        await admin
          .from("extracted_points")
          .select("id")
          .eq("participant_id", participantId)
      ).data?.map((p) => p.id) ?? [],
    );
  if (existingAssignments && existingAssignments.length) {
    return { skipped: true };
  }

  const { data: pointRows } = await admin
    .from("extracted_points")
    .select("id, surface_phrase, want, context, rationale, doubts")
    .eq("participant_id", participantId)
    .order("idx", { ascending: true });
  if (!pointRows || pointRows.length === 0) throw new Error("no points to cluster");

  const newPoints: NewPoint[] = pointRows
    .filter((p) => p.surface_phrase?.trim())
    .map((p) => ({
      id: p.id,
      surface_phrase: p.surface_phrase ?? "",
      want: p.want ?? "",
      context: p.context ?? "",
      rationale: p.rationale ?? "",
      doubts: p.doubts ?? [],
    }));

  const { data: existing } = await admin
    .from("themes")
    .select("id, short_name, description")
    .eq("session_id", participant.session_id);
  const existingThemes: ExistingTheme[] = (existing ?? []).map((t) => ({
    id: t.id,
    short_name: t.short_name,
    description: t.description,
  }));

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: ResponseSchema,
    system: CLUSTERING_SYSTEM,
    prompt: renderClusteringPrompt(session.question, existingThemes, newPoints),
  });

  const tempIdToReal: Record<string, string> = {};
  if (object.new_themes.length) {
    const insertRows = object.new_themes.map((t) => ({
      session_id: participant.session_id,
      short_name: t.short_name,
      description: t.description,
    }));
    const { data: inserted, error } = await admin
      .from("themes")
      .insert(insertRows)
      .select("id");
    if (error || !inserted) throw new Error(`themes insert failed: ${error?.message}`);
    object.new_themes.forEach((t, i) => {
      tempIdToReal[t.temp_id] = inserted[i].id;
    });
  }

  const knownIds = new Set(existingThemes.map((t) => t.id));
  const assignmentRows: { point_id: string; theme_id: string }[] = [];
  for (const a of object.assignments) {
    for (const tid of a.theme_ids) {
      const real = tempIdToReal[tid] ?? (knownIds.has(tid) ? tid : null);
      if (real) assignmentRows.push({ point_id: a.point_id, theme_id: real });
    }
  }
  if (assignmentRows.length) {
    const { error } = await admin
      .from("theme_assignments")
      .upsert(assignmentRows, { onConflict: "point_id,theme_id" });
    if (error) throw new Error(`theme_assignments insert failed: ${error.message}`);
  }

  return { skipped: false, newThemes: object.new_themes.length, assignments: assignmentRows.length };
}
