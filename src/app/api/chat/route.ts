import type { MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";

import { FACILITATOR_MODEL, getAnthropic } from "@/lib/anthropic";
import { ensureAnonymousUser, getOrCreateParticipant } from "@/lib/participant";
import {
  buildPerspectivesBlock,
  READY_TOKEN,
  renderFacilitatorSystem,
} from "@/lib/prompts/facilitator";
import { createAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

type ClientMessage = { role: "user" | "assistant"; content: string };
type Body = { messages: ClientMessage[]; sessionCode: string };

export async function POST(req: Request) {
  const { messages, sessionCode }: Body = await req.json();
  if (!sessionCode) return new Response("missing sessionCode", { status: 400 });

  const { user } = await ensureAnonymousUser();
  const { session, participant } = await getOrCreateParticipant(sessionCode, user.id);
  if (session.status !== "open") {
    return new Response("session is closed", { status: 403 });
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

  // Persist the most recent user message before streaming.
  const lastUser = messages[messages.length - 1];
  if (lastUser?.role === "user" && lastUser.content.trim()) {
    const { count } = await admin
      .from("transcript_turns")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participant.id);
    await admin.from("transcript_turns").insert({
      participant_id: participant.id,
      ord: count ?? 0,
      role: "user",
      content: lastUser.content,
      via: "text",
    });
  }

  const apiMessages: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const system: TextBlockParam[] = [
    {
      type: "text",
      text: systemText,
      cache_control: { type: "ephemeral" },
    },
  ];

  const anthropic = getAnthropic();
  const result = anthropic.messages.stream({
    model: FACILITATOR_MODEL,
    max_tokens: 4096,
    system,
    messages: apiMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of result) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await result.finalMessage();
        const fullText = final.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("");

        const { count } = await admin
          .from("transcript_turns")
          .select("id", { count: "exact", head: true })
          .eq("participant_id", participant.id);
        await admin.from("transcript_turns").insert({
          participant_id: participant.id,
          ord: count ?? 0,
          role: "assistant",
          content: fullText,
          via: "text",
        });

        // Phase stays "in_conversation" until /api/finalize runs after phone verification.
        void participant;
      } catch (err) {
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
