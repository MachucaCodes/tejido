import { REFUSAL_RECOVERY, startFacilitatorTurn } from "@/lib/facilitator-turn";
import { ensureAnonymousUser, getOrCreateParticipant } from "@/lib/participant";

export const maxDuration = 60;

type Body = { message: string; sessionCode: string };

export async function POST(req: Request) {
  const { message, sessionCode }: Body = await req.json();
  if (!sessionCode) return new Response("missing sessionCode", { status: 400 });
  const userText = (message ?? "").trim();
  if (!userText) return new Response("empty message", { status: 400 });

  const { user } = await ensureAnonymousUser();
  const { session, participant } = await getOrCreateParticipant(sessionCode, user.id);
  if (session.archived_at) {
    return new Response("session is archived", { status: 403 });
  }
  if (session.status !== "open") {
    return new Response("session is closed", { status: 403 });
  }
  if (participant.phase !== "in_conversation") {
    return new Response("conversation already complete", { status: 403 });
  }

  const turn = await startFacilitatorTurn({ session, participant, userText, via: "text" });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffered = "";
      try {
        for await (const event of turn.stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            buffered += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // A refusal streams a recovery line so the UI doesn't go silent.
        // Phase stays "in_conversation" for the lifetime of the session — the
        // redesign removed the terminal-complete phase. /api/finalize is a
        // re-runnable share trigger that the chat client fires on every
        // [READY_TO_SHARE], not a one-shot completion step.
        const { refusal } = await turn.finish();
        if (refusal) controller.enqueue(encoder.encode(REFUSAL_RECOVERY));
      } catch (err) {
        await turn.fail(err, buffered);
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
