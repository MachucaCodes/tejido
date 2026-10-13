import type { MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";

import { FACILITATOR_MODEL, getAnthropic } from "@/lib/anthropic";
import { logLlmCall } from "@/lib/observability";
import type { ParticipantRecord, SessionRecord } from "@/lib/participant";
import { buildPerspectivesBlock, renderFacilitatorSystem } from "@/lib/prompts/facilitator";
import { createAdmin } from "@/lib/supabase/admin";

export const REFUSAL_RECOVERY =
  "Sorry — I lost the thread there. Could you try saying that again?";

/**
 * One facilitator turn, shared by the web chat (streams tokens to the browser)
 * and WhatsApp (waits for the whole reply). Persists the user turn up front;
 * `finish()` persists the assistant turn, or rolls the user turn back on a
 * refusal. Callers that stream iterate `stream` before calling `finish()`.
 */
export async function startFacilitatorTurn({
  session,
  participant,
  userText,
  via,
}: {
  session: SessionRecord;
  participant: ParticipantRecord;
  userText: string;
  via: "text" | "voice";
}) {
  const admin = createAdmin();

  const { data: themes } = await admin
    .from("themes")
    .select("short_name, description")
    .eq("session_id", session.id);

  const systemText = renderFacilitatorSystem(
    session.topic,
    session.context,
    buildPerspectivesBlock(themes ?? [], session.prompt_perspectives_instructions),
    session.instructions,
    {
      taskFraming: session.prompt_task_framing,
      mechanics: session.prompt_mechanics,
      pacing: session.prompt_pacing,
    },
  );

  // Server is the source of truth for transcript history. Pull prior turns,
  // append the new user message, and persist before streaming.
  const { data: priorTurns } = await admin
    .from("transcript_turns")
    .select("role, content, ord")
    .eq("participant_id", participant.id)
    .order("ord", { ascending: true });

  const nextOrd = priorTurns?.length ?? 0;
  await admin.from("transcript_turns").insert({
    participant_id: participant.id,
    ord: nextOrd,
    role: "user",
    content: userText,
    via,
  });

  // Drop user/empty-assistant pairs and stray empty assistant turns left
  // behind by older refusal handling. An empty assistant in the history
  // re-triggers Anthropic's safety filter and locks the conversation into
  // a permanent refusal state, so it has to be filtered before the call.
  const turns = priorTurns ?? [];
  const cleanedHistory: { role: "user" | "assistant"; content: string }[] = [];
  for (let i = 0; i < turns.length; i += 1) {
    const t = turns[i];
    const next = turns[i + 1];
    if (
      t.role === "user" &&
      next?.role === "assistant" &&
      (next.content ?? "").trim() === ""
    ) {
      i += 1;
      continue;
    }
    if (t.role === "assistant" && (t.content ?? "").trim() === "") continue;
    cleanedHistory.push({
      role: t.role as "user" | "assistant",
      content: t.content,
    });
  }

  const apiMessages: MessageParam[] = [
    ...cleanedHistory,
    { role: "user" as const, content: userText },
  ];

  // Thinking stays ON at low effort, set explicitly. Haiku 5.5 defaults to
  // medium, and a thinking-disabled turn can leak `<thinking>` tags into the
  // visible text, which is streamed straight to the participant and stored
  // verbatim as the transcript. Low effort keeps the pause before the first
  // token short.
  //
  // max_tokens is a hard cap on thinking PLUS response text, so it goes up with
  // thinking switched on — at 4096 a long turn could truncate mid-sentence.
  const requestParams = {
    model: FACILITATOR_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" as const },
    output_config: { effort: "low" as const },
  };

  const system: TextBlockParam[] = [
    {
      type: "text",
      text: systemText,
      cache_control: { type: "ephemeral" },
    },
  ];

  const startedAt = Date.now();
  const stream = getAnthropic().messages.stream({
    ...requestParams,
    system,
    messages: apiMessages,
  });

  const logBase = {
    kind: "facilitator_turn" as const,
    model: FACILITATOR_MODEL,
    session_id: session.id,
    participant_id: participant.id,
    system_prompt: systemText,
    request_messages: apiMessages,
    request_params: requestParams,
  };

  async function finish(): Promise<{ text: string; refusal: boolean }> {
    const final = await stream.finalMessage();
    const fullText = final.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    // Anthropic returns stop_reason: "refusal" with empty content when
    // its safety system flags the input — most often a garbled voice
    // transcript with heavy repetition. Persisting that empty turn (and
    // the user turn that produced it) poisons the next request: the
    // stale context keeps re-triggering the refusal even when the
    // participant's follow-up is fine. Roll the user turn back and skip
    // the assistant insert; the caller shows REFUSAL_RECOVERY instead.
    const refusal = final.stop_reason === "refusal" || fullText.trim().length === 0;

    if (refusal) {
      await admin
        .from("transcript_turns")
        .delete()
        .eq("participant_id", participant.id)
        .eq("ord", nextOrd);

      await logLlmCall({
        ...logBase,
        duration_ms: Date.now() - startedAt,
        turn_id: null,
        status: "refusal",
        raw_response: final,
      });
      return { text: "", refusal: true };
    }

    const { data: insertedTurn } = await admin
      .from("transcript_turns")
      .insert({
        participant_id: participant.id,
        ord: nextOrd + 1,
        role: "assistant",
        content: fullText,
        via: "text",
      })
      .select("id")
      .single();

    await logLlmCall({
      ...logBase,
      duration_ms: Date.now() - startedAt,
      turn_id: insertedTurn?.id ?? null,
      status: "success",
      raw_response: final,
    });
    return { text: fullText, refusal: false };
  }

  async function fail(err: unknown, buffered: string) {
    await logLlmCall({
      ...logBase,
      duration_ms: Date.now() - startedAt,
      status: "stream_aborted",
      error_message: err instanceof Error ? err.message : String(err),
      raw_response_text: buffered || null,
    });
  }

  return { stream, finish, fail };
}
