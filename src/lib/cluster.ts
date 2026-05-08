import { z } from "zod";

import { CLUSTERING_MODEL, getAnthropic } from "@/lib/anthropic";
import { logLlmCall } from "@/lib/observability";
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

const CLUSTERING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["new_themes", "assignments"],
  properties: {
    new_themes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["temp_id", "short_name", "description"],
        properties: {
          temp_id: { type: "string" },
          short_name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    assignments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["point_id", "theme_ids"],
        properties: {
          point_id: { type: "string" },
          theme_ids: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

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
    .select("topic")
    .eq("id", participant.session_id)
    .single();
  if (!session) throw new Error(`session not found`);

  const { data: pointRows } = await admin
    .from("extracted_points")
    .select("id, surface_phrase, want, context, rationale, doubts")
    .eq("participant_id", participantId)
    .order("idx", { ascending: true });
  if (!pointRows || pointRows.length === 0) throw new Error("no points to cluster");

  const { data: existingAssignments } = await admin
    .from("theme_assignments")
    .select("point_id")
    .in(
      "point_id",
      pointRows.map((p) => p.id),
    );
  if (existingAssignments && existingAssignments.length) {
    return { skipped: true };
  }

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

  const requestMessages = [
    {
      role: "user" as const,
      content: renderClusteringPrompt(session.topic, existingThemes, newPoints),
    },
  ];
  const requestParams = {
    model: CLUSTERING_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" as const },
    output_config: {
      format: { type: "json_schema" as const, schema: CLUSTERING_JSON_SCHEMA },
    },
  };

  const anthropic = getAnthropic();
  const startedAt = Date.now();

  let response;
  try {
    response = await anthropic.messages.create({
      ...requestParams,
      system: CLUSTERING_SYSTEM,
      messages: requestMessages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logLlmCall({
      kind: "cluster_points",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: participant.session_id,
      participant_id: participantId,
      system_prompt: CLUSTERING_SYSTEM,
      request_messages: requestMessages,
      request_params: requestParams,
      status: "error",
      error_message: message,
    });
    throw err;
  }

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");

  let parsed;
  try {
    parsed = ResponseSchema.parse(JSON.parse(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logLlmCall({
      kind: "cluster_points",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: participant.session_id,
      participant_id: participantId,
      system_prompt: CLUSTERING_SYSTEM,
      request_messages: requestMessages,
      request_params: requestParams,
      status: "parse_error",
      error_message: message,
      raw_response: response,
      raw_response_text: text,
    });
    throw err;
  }

  await logLlmCall({
    kind: "cluster_points",
    model: CLUSTERING_MODEL,
    duration_ms: Date.now() - startedAt,
    session_id: participant.session_id,
    participant_id: participantId,
    system_prompt: CLUSTERING_SYSTEM,
    request_messages: requestMessages,
    request_params: requestParams,
    status: "success",
    raw_response: response,
    parsed_output: parsed,
  });

  const tempIdToReal: Record<string, string> = {};
  if (parsed.new_themes.length) {
    const insertRows = parsed.new_themes.map((t) => ({
      session_id: participant.session_id,
      short_name: t.short_name,
      description: t.description,
    }));
    const { data: inserted, error } = await admin
      .from("themes")
      .insert(insertRows)
      .select("id");
    if (error || !inserted) throw new Error(`themes insert failed: ${error?.message}`);
    parsed.new_themes.forEach((t, i) => {
      tempIdToReal[t.temp_id] = inserted[i].id;
    });
  }

  const knownIds = new Set(existingThemes.map((t) => t.id));
  const assignmentRows: { point_id: string; theme_id: string }[] = [];
  for (const a of parsed.assignments) {
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

  return {
    skipped: false,
    newThemes: parsed.new_themes.length,
    assignments: assignmentRows.length,
  };
}
