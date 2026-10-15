import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CLUSTERING_MODEL, getAnthropic } from "@/lib/anthropic";
import { logLlmCall } from "@/lib/observability";
import {
  renderSummaryPrompt,
  resolveSummarySystem,
  type ThemeForSummary,
} from "@/lib/prompts/summary";
import { createAdmin } from "@/lib/supabase/admin";

const ResponseSchema = z.object({ summary: z.string() });

const SUMMARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: { summary: { type: "string" } },
} as const;

// Rebuild once the room has grown this much since the last summary. Each
// summary reads every voice, so rebuilding per voice costs O(n²); growing
// by a fixed fraction keeps the total to ~10× one final summary.
const GROWTH_TO_REBUILD = 1.1;

// A rebuild holding the lock longer than this has died (the route's
// maxDuration is 300s), so another may take over.
const LOCK_STALE_MS = 5 * 60 * 1000;

type RegenDecision =
  | { regenerate: false; reason: "no_data" | "no_change" }
  | {
      regenerate: true;
      reason: "no_summary" | "grew" | "forced";
      voices: number;
    };

// Voices = participants with at least one extracted point.
async function countVoices(sessionId: string): Promise<number> {
  const { count } = await createAdmin()
    .from("participants")
    .select("id, extracted_points!inner(id)", { count: "exact", head: true })
    .eq("session_id", sessionId);
  return count ?? 0;
}

async function decideRegen(
  sessionId: string,
  force: boolean,
): Promise<RegenDecision> {
  const admin = createAdmin();

  const [{ count: themeCount }, voices, { data: session }] = await Promise.all([
    admin
      .from("themes")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
    countVoices(sessionId),
    admin
      .from("sessions")
      .select("summary_text, summary_voice_count")
      .eq("id", sessionId)
      .single(),
  ]);
  if (!themeCount || voices === 0)
    return { regenerate: false, reason: "no_data" };

  if (!session?.summary_text) {
    return { regenerate: true, reason: "no_summary", voices };
  }
  const prev = session.summary_voice_count ?? 0;
  if (voices > prev && voices >= prev * GROWTH_TO_REBUILD) {
    return { regenerate: true, reason: "grew", voices };
  }
  // An organizer asked for a rebuild.
  if (force) return { regenerate: true, reason: "forced", voices };
  return { regenerate: false, reason: "no_change" };
}

export async function regenerateSummaryIfStale(
  sessionId: string,
  { force = false }: { force?: boolean } = {},
): Promise<{ regenerated: boolean; reason: string; voices?: number }> {
  const decision = await decideRegen(sessionId, force);
  if (!decision.regenerate) {
    return { regenerated: false, reason: decision.reason };
  }

  // One rebuild per session at a time. Several analyses finishing together
  // used to each fire a rebuild from the same input; the last to finish won.
  const admin = createAdmin();
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const { data: claimed } = await admin
    .from("sessions")
    .update({ summary_regen_started_at: new Date().toISOString() })
    .eq("id", sessionId)
    .or(
      `summary_regen_started_at.is.null,summary_regen_started_at.lt."${staleBefore}"`,
    )
    .select("id");
  if (!claimed?.length)
    return { regenerated: false, reason: "already_running" };

  try {
    return await buildSummary(sessionId, decision);
  } finally {
    await admin
      .from("sessions")
      .update({ summary_regen_started_at: null })
      .eq("id", sessionId);
  }
}

async function buildSummary(
  sessionId: string,
  decision: Extract<RegenDecision, { regenerate: true }>,
): Promise<{ regenerated: boolean; reason: string; voices?: number }> {
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("topic, prompt_summary_system, prompt_summary_prompt")
    .eq("id", sessionId)
    .single();
  if (!session) return { regenerated: false, reason: "session_missing" };

  const summarySystem = resolveSummarySystem(session.prompt_summary_system);

  const { data: themeRows } = await admin
    .from("themes")
    .select("id, short_name, description")
    .eq("session_id", sessionId);
  if (!themeRows || themeRows.length === 0) {
    return { regenerated: false, reason: "no_themes" };
  }
  const themeIds = themeRows.map((t) => t.id);

  const { data: assignments } = await admin
    .from("theme_assignments")
    .select("theme_id, point_id, created_at")
    .in("theme_id", themeIds)
    .order("created_at", { ascending: true });

  // Collect EVERY point per theme — the summarizer should see all the
  // voices, not just the most recent few, so the synthesis reflects the
  // whole room rather than whoever spoke last.
  const pointIdsByTheme: Record<string, string[]> = {};
  for (const a of assignments ?? []) {
    (pointIdsByTheme[a.theme_id] ??= []).push(a.point_id);
  }

  const allPointIds = Array.from(
    new Set(Object.values(pointIdsByTheme).flat()),
  );
  const phraseById = new Map<string, string>();
  const participantById = new Map<string, string>();
  if (allPointIds.length) {
    const { data: pointRows } = await admin
      .from("extracted_points")
      .select("id, surface_phrase, participant_id")
      .in("id", allPointIds);
    for (const p of pointRows ?? []) {
      const phrase = (p.surface_phrase ?? "").trim();
      if (phrase) phraseById.set(p.id, phrase);
      if (p.participant_id) participantById.set(p.id, p.participant_id);
    }
  }

  // Voice counts per theme = unique participants. Counting assignment
  // rows over-counts participants whose transcript produced multiple
  // points under one theme, which distorts the share/percentage the
  // summary prompt presents as "how many people landed on each."
  const countsByTheme: Record<string, number> = {};
  for (const [tid, ids] of Object.entries(pointIdsByTheme)) {
    const participants = new Set<string>();
    for (const id of ids) {
      const pid = participantById.get(id);
      if (pid) participants.add(pid);
    }
    countsByTheme[tid] = participants.size;
  }
  const total = Object.values(countsByTheme).reduce((s, n) => s + n, 0);

  const themeInputs: ThemeForSummary[] = themeRows.map((t) => {
    const count = countsByTheme[t.id] ?? 0;
    // Every distinct phrase under this theme, in chronological order.
    const samples = Array.from(
      new Set(
        (pointIdsByTheme[t.id] ?? [])
          .map((id) => phraseById.get(id) ?? "")
          .filter(Boolean),
      ),
    );
    return {
      id: t.id,
      short_name: t.short_name,
      description: t.description,
      count,
      share: total ? count / total : 0,
      samples,
    };
  });

  const requestMessages = [
    {
      role: "user" as const,
      content: renderSummaryPrompt(
        session.topic ?? "",
        themeInputs,
        session.prompt_summary_prompt,
      ),
    },
  ];
  const requestParams = {
    model: CLUSTERING_MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" as const },
    output_config: {
      // Opus 5.5 defaults to medium; pinned to the high this ran at on Opus 5.
      effort: "high" as const,
      format: { type: "json_schema" as const, schema: SUMMARY_JSON_SCHEMA },
    },
  };

  const anthropic = getAnthropic();
  const startedAt = Date.now();

  let response;
  try {
    response = await anthropic.messages.create({
      ...requestParams,
      system: summarySystem,
      messages: requestMessages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logLlmCall({
      kind: "summarize_session",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: sessionId,
      system_prompt: summarySystem,
      request_messages: requestMessages,
      request_params: requestParams,
      status: "error",
      error_message: message,
    });
    throw err;
  }

  // See analyze.ts — a refusal returns 200 with no text block, which would
  // otherwise read as a JSON parse error.
  if (response.stop_reason === "refusal") {
    const message = `model refused: ${response.stop_details?.category ?? "unknown"}`;
    await logLlmCall({
      kind: "summarize_session",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: sessionId,
      system_prompt: summarySystem,
      request_messages: requestMessages,
      request_params: requestParams,
      status: "refusal",
      raw_response: response,
    });
    throw new Error(message);
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
      kind: "summarize_session",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: sessionId,
      system_prompt: summarySystem,
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
    kind: "summarize_session",
    model: CLUSTERING_MODEL,
    duration_ms: Date.now() - startedAt,
    session_id: sessionId,
    system_prompt: summarySystem,
    request_messages: requestMessages,
    request_params: requestParams,
    status: "success",
    raw_response: response,
    parsed_output: parsed,
  });

  const { error: updateError } = await admin
    .from("sessions")
    .update({
      summary_text: parsed.summary,
      summary_voice_count: decision.voices,
      summary_generated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (updateError) {
    throw new Error(`session summary update failed: ${updateError.message}`);
  }

  // Bust the page's server-side fetch cache so the next render of the
  // session route reads the fresh summary instead of a cached snapshot.
  revalidatePath(`/s/${sessionId}`);

  return {
    regenerated: true,
    reason: decision.reason,
    voices: decision.voices,
  };
}
