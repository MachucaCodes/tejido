import { z } from "zod";

import { CLUSTERING_MODEL, getAnthropic } from "@/lib/anthropic";
import { logLlmCall } from "@/lib/observability";
import {
  renderAnalysisPrompt,
  resolveAnalysisSystem,
  type ExistingTheme,
} from "@/lib/prompts/analysis";
import { createAdmin } from "@/lib/supabase/admin";

const PointSchema = z.object({
  surface_phrase: z.string(),
  want: z.string(),
  context: z.string(),
  rationale: z.string(),
  doubts: z.array(z.string()),
});

const ResponseSchema = z.object({
  points: z.array(PointSchema).max(8),
  theme_updates: z
    .array(
      z.object({
        id: z.string(),
        short_name: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
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
    z.object({
      point_idx: z.number().int().min(0),
      theme_ids: z.array(z.string()).default([]),
    }),
  ),
});

// Anthropic structured-outputs JSON schema. min/maxItems are not supported here
// — bounds are enforced client-side via Zod after parsing.
const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["points", "theme_updates", "new_themes", "assignments"],
  properties: {
    points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["surface_phrase", "want", "context", "rationale", "doubts"],
        properties: {
          surface_phrase: { type: "string" },
          want: { type: "string" },
          context: { type: "string" },
          rationale: { type: "string" },
          doubts: { type: "array", items: { type: "string" } },
        },
      },
    },
    theme_updates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "short_name", "description"],
        properties: {
          id: { type: "string" },
          short_name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
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
        required: ["point_idx", "theme_ids"],
        properties: {
          point_idx: { type: "integer" },
          theme_ids: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export type AnalyzeResult = {
  pointCount: number;
  newThemeCount: number;
  themeUpdateCount: number;
  assignmentCount: number;
  // True when the call was a no-op because nothing in the transcript has
  // advanced past the prior analysis anchor. Callers can use this for
  // observability/logging; the room state is unchanged on skip.
  skipped: boolean;
};

/**
 * Run the fused extract+cluster+broaden pass for one participant.
 *
 * Re-runnable: every call wipes the participant's existing extracted_points
 * (theme_assignments cascade-delete via FK) and reinserts a fresh batch
 * based on the latest transcript. Theme name/description rewrites are
 * cumulative — we accept drift across re-runs in exchange for participants
 * being able to keep talking and have their picture update in place.
 */
export async function analyzeParticipant(participantId: string): Promise<AnalyzeResult> {
  const admin = createAdmin();

  const { data: participant, error: pErr } = await admin
    .from("participants")
    .select("id, session_id, last_analyzed_turn_ord")
    .eq("id", participantId)
    .single();
  if (pErr || !participant) throw new Error(`participant not found: ${participantId}`);

  const { data: session } = await admin
    .from("sessions")
    .select("topic, prompt_analysis_system, prompt_analysis_prompt")
    .eq("id", participant.session_id)
    .single();
  if (!session) throw new Error(`session not found: ${participant.session_id}`);

  const analysisSystem = resolveAnalysisSystem(session.prompt_analysis_system);

  const { data: turns } = await admin
    .from("transcript_turns")
    .select("role, content, ord")
    .eq("participant_id", participantId)
    .order("ord", { ascending: true });
  if (!turns || turns.length < 2) {
    throw new Error("not enough transcript turns to analyze");
  }

  // Dedup against the prior analysis anchor. Reloads after [READY_TO_SHARE]
  // re-arm the client effect and fire finalize again even though nothing
  // in the transcript has moved; this guard skips the Opus call in that
  // case. Without it every reload costs ~$0.10–0.20 and can drift the
  // theme set because the delete/reinsert below mints fresh themes from a
  // newly-sampled LLM output.
  const latestOrd = turns[turns.length - 1].ord;
  const anchorOrd = participant.last_analyzed_turn_ord ?? -1;
  if (latestOrd <= anchorOrd) {
    return {
      pointCount: 0,
      newThemeCount: 0,
      themeUpdateCount: 0,
      assignmentCount: 0,
      skipped: true,
    };
  }

  const transcript = turns
    .map((t) => `${t.role === "user" ? "Participant" : "Facilitator"}: ${t.content}`)
    .join("\n\n");

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
      content: renderAnalysisPrompt(
        session.topic,
        existingThemes,
        transcript,
        session.prompt_analysis_prompt,
      ),
    },
  ];
  const requestParams = {
    model: CLUSTERING_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" as const },
    output_config: {
      format: { type: "json_schema" as const, schema: ANALYSIS_JSON_SCHEMA },
    },
  };

  const anthropic = getAnthropic();
  const startedAt = Date.now();

  let response;
  try {
    response = await anthropic.messages.create({
      ...requestParams,
      system: analysisSystem,
      messages: requestMessages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logLlmCall({
      kind: "analyze_participant",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: participant.session_id,
      participant_id: participantId,
      system_prompt: analysisSystem,
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
      kind: "analyze_participant",
      model: CLUSTERING_MODEL,
      duration_ms: Date.now() - startedAt,
      session_id: participant.session_id,
      participant_id: participantId,
      system_prompt: analysisSystem,
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
    kind: "analyze_participant",
    model: CLUSTERING_MODEL,
    duration_ms: Date.now() - startedAt,
    session_id: participant.session_id,
    participant_id: participantId,
    system_prompt: analysisSystem,
    request_messages: requestMessages,
    request_params: requestParams,
    status: "success",
    raw_response: response,
    parsed_output: parsed,
  });

  // When the model returns zero points (e.g. the participant asked to skip
  // straight to the summary and there's nothing extractable in the new
  // turns), don't wipe prior analysis — leave existing points alone and
  // just advance the anchor below.
  const idxToPointId = new Map<number, string>();
  if (parsed.points.length > 0) {
    // Wipe the participant's existing points (theme_assignments cascade-delete
    // via the point_id FK). Then reinsert from the new analysis pass.
    const { error: delErr } = await admin
      .from("extracted_points")
      .delete()
      .eq("participant_id", participantId);
    if (delErr) throw new Error(`extracted_points delete failed: ${delErr.message}`);

    const pointRows = parsed.points.map((p, idx) => ({
      participant_id: participantId,
      idx,
      surface_phrase: p.surface_phrase,
      want: p.want,
      context: p.context,
      rationale: p.rationale,
      doubts: p.doubts,
    }));
    const { data: insertedPoints, error: insErr } = await admin
      .from("extracted_points")
      .insert(pointRows)
      .select("id, idx");
    if (insErr || !insertedPoints) {
      throw new Error(`extracted_points insert failed: ${insErr?.message}`);
    }
    for (const row of insertedPoints) {
      idxToPointId.set(row.idx as number, row.id as string);
    }
  }

  // Apply theme broadenings. Validate ids against the snapshot we read
  // earlier — silently drop hallucinated ids.
  const knownThemeIds = new Set(existingThemes.map((t) => t.id));
  const validUpdates = parsed.theme_updates.filter((u) => knownThemeIds.has(u.id));
  for (const u of validUpdates) {
    const { error: upErr } = await admin
      .from("themes")
      .update({
        short_name: u.short_name,
        description: u.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.id);
    if (upErr) {
      console.error(`[analyze] theme update failed for ${u.id}:`, upErr.message);
    }
  }

  // Mint any new themes the model proposed.
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

  // Build assignment rows. Resolve temp_ids to real ids, validate the
  // theme references against the union of (existing ∪ newly-minted), and
  // skip anything that doesn't resolve.
  const validThemeIds = new Set([...knownThemeIds, ...Object.values(tempIdToReal)]);
  const assignmentRows: { point_id: string; theme_id: string }[] = [];
  for (const a of parsed.assignments) {
    const pointId = idxToPointId.get(a.point_idx);
    if (!pointId) continue;
    for (const tid of a.theme_ids) {
      const real = tempIdToReal[tid] ?? (validThemeIds.has(tid) ? tid : null);
      if (real) assignmentRows.push({ point_id: pointId, theme_id: real });
    }
  }
  if (assignmentRows.length) {
    const { error } = await admin
      .from("theme_assignments")
      .upsert(assignmentRows, { onConflict: "point_id,theme_id" });
    if (error) throw new Error(`theme_assignments insert failed: ${error.message}`);
  }

  // Advance the anchor so the next finalize call against an unchanged
  // transcript short-circuits. Best-effort: an error here doesn't unwind
  // the analysis we just wrote, so log and move on.
  const { error: anchorErr } = await admin
    .from("participants")
    .update({ last_analyzed_turn_ord: latestOrd })
    .eq("id", participantId);
  if (anchorErr) {
    console.error(
      `[analyze] anchor update failed for ${participantId}:`,
      anchorErr.message,
    );
  }

  return {
    pointCount: parsed.points.length,
    newThemeCount: parsed.new_themes.length,
    themeUpdateCount: validUpdates.length,
    assignmentCount: assignmentRows.length,
    skipped: false,
  };
}
