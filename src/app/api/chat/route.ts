import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createAdmin } from "@/lib/supabase/admin";
import { ensureAnonymousUser, getOrCreateParticipant } from "@/lib/participant";
import {
  buildPerspectivesBlock,
  READY_TOKEN,
  renderFacilitatorSystem,
} from "@/lib/prompts/facilitator";

export const maxDuration = 60;

type Body = { messages: UIMessage[]; sessionCode: string };

function lastTextOf(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

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

  const system = renderFacilitatorSystem(
    session.question,
    buildPerspectivesBlock(themes ?? []),
  );

  const lastUser = messages[messages.length - 1];
  if (lastUser?.role === "user") {
    const text = lastTextOf(lastUser);
    if (text.trim()) {
      const { count } = await admin
        .from("transcript_turns")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", participant.id);
      await admin.from("transcript_turns").insert({
        participant_id: participant.id,
        ord: count ?? 0,
        role: "user",
        content: text,
        via: "text",
      });
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      const { count } = await admin
        .from("transcript_turns")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", participant.id);
      await admin.from("transcript_turns").insert({
        participant_id: participant.id,
        ord: count ?? 0,
        role: "assistant",
        content: text,
        via: "text",
      });

      if (text.includes(READY_TOKEN) && participant.phase === "in_conversation") {
        await admin
          .from("participants")
          .update({ phase: "awaiting_verification" })
          .eq("id", participant.id);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
