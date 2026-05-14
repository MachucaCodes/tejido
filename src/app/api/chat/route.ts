import type { MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";

import { FACILITATOR_MODEL, getAnthropic } from "@/lib/anthropic";
import { logLlmCall } from "@/lib/observability";
import { ensureAnonymousUser, getOrCreateParticipant } from "@/lib/participant";
import {
  buildPerspectivesBlock,
  READY_TOKEN,
  renderFacilitatorSystem,
} from "@/lib/prompts/facilitator";
import { createAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

type Body = { message: string; sessionCode: string };

export async function POST(req: Request) {
  const { message, sessionCode }: Body = await req.json();
  if (!sessionCode) return new Response("missing sessionCode", { status: 400 });
  const userText = (message ?? "").trim();
  if (!userText) return new Response("empty message", { status: 400 });

  const { user } = await ensureAnonymousUser();
  const { session, participant } = await getOrCreateParticipant(sessionCode, user.id);
  if (session.status !== "open") {
    return new Response("session is closed", { status: 403 });
  }
  if (participant.phase !== "in_conversation") {
    return new Response("conversation already complete", { status: 403 });
  }

  const admin = createAdmin();

  const { data: themes } = await admin
    .from("themes")
    .select("short_name, description")
    .eq("session_id", session.id);

  const systemText = renderFacilitatorSystem(
    session.topic,
    session.context,
    buildPerspectivesBlock(themes ?? []),
    session.instructions,
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
    via: "text",
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

  const requestParams = {
    model: FACILITATOR_MODEL,
    max_tokens: 4096,
  };

  const system: TextBlockParam[] = [
    {
      type: "text",
      text: systemText,
      cache_control: { type: "ephemeral" },
    },
  ];

  const anthropic = getAnthropic();
  const startedAt = Date.now();
  const result = anthropic.messages.stream({
    ...requestParams,
    system,
    messages: apiMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffered = "";
      try {
        for await (const event of result) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            buffered += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await result.finalMessage();
        const fullText = final.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("");

        // Anthropic returns stop_reason: "refusal" with empty content when
        // its safety system flags the input — most often a garbled voice
        // transcript with heavy repetition. Persisting that empty turn (and
        // the user turn that produced it) poisons the next request: the
        // stale context keeps re-triggering the refusal even when the
        // participant's follow-up is fine. Roll the user turn back, skip
        // the assistant insert, and stream a recovery line so the UI
        // doesn't go silent.
        const isRefusal =
          final.stop_reason === "refusal" || fullText.trim().length === 0;

        if (isRefusal) {
          await admin
            .from("transcript_turns")
            .delete()
            .eq("participant_id", participant.id)
            .eq("ord", nextOrd);

          const recovery =
            "Sorry — I lost the thread there. Could you try saying that again?";
          controller.enqueue(encoder.encode(recovery));

          await logLlmCall({
            kind: "facilitator_turn",
            model: FACILITATOR_MODEL,
            duration_ms: Date.now() - startedAt,
            session_id: session.id,
            participant_id: participant.id,
            turn_id: null,
            system_prompt: systemText,
            request_messages: apiMessages,
            request_params: requestParams,
            status: "refusal",
            raw_response: final,
          });
        } else {
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
            kind: "facilitator_turn",
            model: FACILITATOR_MODEL,
            duration_ms: Date.now() - startedAt,
            session_id: session.id,
            participant_id: participant.id,
            turn_id: insertedTurn?.id ?? null,
            system_prompt: systemText,
            request_messages: apiMessages,
            request_params: requestParams,
            status: "success",
            raw_response: final,
          });
        }

        // Phase stays "in_conversation" for the lifetime of the session — the
        // redesign removed the terminal-complete phase. /api/finalize is a
        // re-runnable share trigger that the chat client fires on every
        // [READY_TO_SHARE], not a one-shot completion step.
        void participant;
        void READY_TOKEN;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await logLlmCall({
          kind: "facilitator_turn",
          model: FACILITATOR_MODEL,
          duration_ms: Date.now() - startedAt,
          session_id: session.id,
          participant_id: participant.id,
          system_prompt: systemText,
          request_messages: apiMessages,
          request_params: requestParams,
          status: "stream_aborted",
          error_message: errMsg,
          raw_response_text: buffered || null,
        });
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
