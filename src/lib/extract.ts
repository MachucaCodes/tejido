import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import { renderExtractionPrompt } from "@/lib/prompts/extraction";
import { createAdmin } from "@/lib/supabase/admin";

const PointSchema = z.object({
  surface_phrase: z.string(),
  want: z.string(),
  context: z.string(),
  rationale: z.string(),
  doubts: z.array(z.string()),
});

const PointsSchema = z.object({ points: z.array(PointSchema).min(1).max(8) });

export async function extractPointsForParticipant(participantId: string) {
  const admin = createAdmin();

  const { data: existing } = await admin
    .from("extracted_points")
    .select("id")
    .eq("participant_id", participantId);
  if (existing && existing.length) return { skipped: true, count: existing.length };

  const { data: turns } = await admin
    .from("transcript_turns")
    .select("role, content")
    .eq("participant_id", participantId)
    .order("ord", { ascending: true });
  if (!turns || turns.length < 2) {
    throw new Error("not enough transcript turns to extract from");
  }

  const transcript = turns
    .map((t) => `${t.role === "user" ? "Participant" : "Facilitator"}: ${t.content}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: PointsSchema,
    prompt: renderExtractionPrompt(transcript),
  });

  const rows = object.points.map((p, idx) => ({
    participant_id: participantId,
    idx,
    surface_phrase: p.surface_phrase,
    want: p.want,
    context: p.context,
    rationale: p.rationale,
    doubts: p.doubts,
  }));
  const { error } = await admin.from("extracted_points").insert(rows);
  if (error) throw new Error(`extracted_points insert failed: ${error.message}`);

  return { skipped: false, count: rows.length };
}
