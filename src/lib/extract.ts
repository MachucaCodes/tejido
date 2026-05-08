import { z } from "zod";

import { EXTRACTION_MODEL, getAnthropic } from "@/lib/anthropic";
import { logLlmCall } from "@/lib/observability";
import { renderExtractionPrompt } from "@/lib/prompts/extraction";
import { createAdmin } from "@/lib/supabase/admin";

const PointSchema = z.object({
  surface_phrase: z.string(),
  want: z.string(),
  context: z.string(),
  rationale: z.string(),
  doubts: z.array(z.string()),
});
const PointsArray = z.array(PointSchema).min(1).max(8);

// Anthropic's structured-outputs JSON schema validator rejects min/maxItems —
// bounds are enforced client-side via Zod (PointsArray) after parsing.
const POINTS_JSON_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      surface_phrase: { type: "string" },
      want: { type: "string" },
      context: { type: "string" },
      rationale: { type: "string" },
      doubts: { type: "array", items: { type: "string" } },
    },
    required: ["surface_phrase", "want", "context", "rationale", "doubts"],
  },
} as const;

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

  const { data: participant } = await admin
    .from("participants")
    .select("session_id")
    .eq("id", participantId)
    .maybeSingle();

  const requestMessages = [
    { role: "user" as const, content: renderExtractionPrompt(transcript) },
  ];
  const requestParams = {
    model: EXTRACTION_MODEL,
    max_tokens: 8192,
    output_config: {
      format: { type: "json_schema" as const, schema: POINTS_JSON_SCHEMA },
    },
  };

  const anthropic = getAnthropic();
  const startedAt = Date.now();

  let response;
  try {
    response = await anthropic.messages.create({
      ...requestParams,
      messages: requestMessages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logLlmCall({
      kind: "extract_points",
      model: EXTRACTION_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: participant?.session_id ?? null,
      participant_id: participantId,
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

  let points;
  try {
    points = PointsArray.parse(JSON.parse(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logLlmCall({
      kind: "extract_points",
      model: EXTRACTION_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: participant?.session_id ?? null,
      participant_id: participantId,
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
    kind: "extract_points",
    model: EXTRACTION_MODEL,
    duration_ms: Date.now() - startedAt,
    session_id: participant?.session_id ?? null,
    participant_id: participantId,
    request_messages: requestMessages,
    request_params: requestParams,
    status: "success",
    raw_response: response,
    parsed_output: points,
  });

  const rows = points.map((p, idx) => ({
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
