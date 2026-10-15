import { requireAdmin } from "@/lib/admin-guard";
import { getAnthropic, SESSION_BUILDER_MODEL } from "@/lib/anthropic";
import {
  PROPOSE_TOOL,
  SESSION_BUILDER_SYSTEM,
  toApiMessages,
  type BuilderMessage,
  type SessionDraft,
} from "@/lib/session-builder";

export const maxDuration = 60;

type Body = {
  messages: BuilderMessage[];
  // The draft as it stands in the panel, including the organizer's edits.
  currentDraft?: SessionDraft | null;
};

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
      status: guard.reason === "unauth" ? 401 : 403,
    });
  }

  const { messages, currentDraft }: Body = await req.json();
  if (!messages?.length || messages.at(-1)?.role !== "user") {
    return new Response("last message must be from the user", { status: 400 });
  }

  const stream = getAnthropic().messages.stream({
    model: SESSION_BUILDER_MODEL,
    max_tokens: 4000,
    system: SESSION_BUILDER_SYSTEM,
    tools: [PROPOSE_TOOL],
    messages: toApiMessages(messages, currentDraft ?? null),
  });

  // Newline-delimited JSON: {"text": "..."} chunks, then at most one
  // {"draft": {...}} when the model proposes a session.
  const encoder = new TextEncoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, v: unknown) =>
    c.enqueue(encoder.encode(JSON.stringify(v) + "\n"));

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        stream.on("text", (text) => send(controller, { text }));
        const final = await stream.finalMessage();
        const draft = final.content.find(
          (b) => b.type === "tool_use" && b.name === PROPOSE_TOOL.name,
        );
        if (draft?.type === "tool_use") send(controller, { draft: draft.input });
      } catch (err) {
        console.error("[session-builder]", err);
        send(controller, { error: "Something went wrong. Try again." });
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
