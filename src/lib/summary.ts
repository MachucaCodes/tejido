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

const TV_THRESHOLD = 0.2;
const MIN_TOTAL_POINTS_TO_GENERATE = 3;
const SAMPLES_PER_THEME = 3;

export type Shares = Record<string, number>;

export function totalVariation(a: Shares, b: Shares): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let sum = 0;
  for (const k of keys) sum += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
  return sum / 2;
}

function sharesFromCounts(counts: Record<string, number>): Shares {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0) return {};
  const out: Shares = {};
  for (const [k, n] of Object.entries(counts)) out[k] = n / total;
  return out;
}

type RegenDecision =
  | { regenerate: false; reason: "no_data" | "too_few_points" | "no_change" }
  | {
      regenerate: true;
      reason: "no_summary" | "tv_exceeded";
      tv: number;
      currentShares: Shares;
    };

async function decideRegen(sessionId: string): Promise<RegenDecision> {
  const admin = createAdmin();

  const { data: themes } = await admin
    .from("themes")
    .select("id")
    .eq("session_id", sessionId);
  const themeIds = (themes ?? []).map((t) => t.id);
  if (themeIds.length === 0) return { regenerate: false, reason: "no_data" };

  const { data: assignments } = await admin
    .from("theme_assignments")
    .select("theme_id")
    .in("theme_id", themeIds);
  const counts: Record<string, number> = {};
  for (const a of assignments ?? [])
    counts[a.theme_id] = (counts[a.theme_id] ?? 0) + 1;
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total < MIN_TOTAL_POINTS_TO_GENERATE) {
    return { regenerate: false, reason: "too_few_points" };
  }

  const currentShares = sharesFromCounts(counts);

  const { data: session } = await admin
    .from("sessions")
    .select("summary_text, summary_shares")
    .eq("id", sessionId)
    .single();

  if (!session?.summary_text) {
    return { regenerate: true, reason: "no_summary", tv: 1, currentShares };
  }

  const prevShares = (session.summary_shares ?? {}) as Shares;
  const tv = totalVariation(prevShares, currentShares);
  if (tv >= TV_THRESHOLD) {
    return { regenerate: true, reason: "tv_exceeded", tv, currentShares };
  }
  return { regenerate: false, reason: "no_change" };
}

export async function regenerateSummaryIfStale(sessionId: string): Promise<{
  regenerated: boolean;
  reason: string;
  tv?: number;
}> {
  const decision = await decideRegen(sessionId);
  if (!decision.regenerate) {
    return { regenerated: false, reason: decision.reason };
  }

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
    .order("created_at", { ascending: false });

  const countsByTheme: Record<string, number> = {};
  const samplePointIdsByTheme: Record<string, string[]> = {};
  for (const a of assignments ?? []) {
    countsByTheme[a.theme_id] = (countsByTheme[a.theme_id] ?? 0) + 1;
    const arr = (samplePointIdsByTheme[a.theme_id] ??= []);
    if (arr.length < SAMPLES_PER_THEME) arr.push(a.point_id);
  }
  const total = Object.values(countsByTheme).reduce((s, n) => s + n, 0);

  const allSampleIds = Array.from(
    new Set(Object.values(samplePointIdsByTheme).flat()),
  );
  const phraseById = new Map<string, string>();
  if (allSampleIds.length) {
    const { data: pointRows } = await admin
      .from("extracted_points")
      .select("id, surface_phrase")
      .in("id", allSampleIds);
    for (const p of pointRows ?? []) {
      const phrase = (p.surface_phrase ?? "").trim();
      if (phrase) phraseById.set(p.id, phrase);
    }
  }

  const themeInputs: ThemeForSummary[] = themeRows.map((t) => {
    const count = countsByTheme[t.id] ?? 0;
    const samples = (samplePointIdsByTheme[t.id] ?? [])
      .map((id) => phraseById.get(id) ?? "")
      .filter(Boolean);
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
      summary_shares: decision.currentShares,
      summary_generated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (updateError) {
    throw new Error(`session summary update failed: ${updateError.message}`);
  }

  // Bust the page's server-side fetch cache so the next render of the
  // session route reads the fresh summary instead of a cached snapshot.
  revalidatePath(`/s/${sessionId}`);

  return { regenerated: true, reason: decision.reason, tv: decision.tv };
}
