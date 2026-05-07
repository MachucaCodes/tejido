"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Button } from "@/components/ui/button";

const READY_TOKEN = "[READY_FOR_RESULTS]";

export default function ChatClient({
  sessionCode,
  question,
}: {
  sessionCode: string;
  question: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionCode },
    }),
  });

  const lastAssistantText =
    [...messages]
      .reverse()
      .find((m) => m.role === "assistant")
      ?.parts.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  useEffect(() => {
    if (
      status === "ready" &&
      lastAssistantText.includes(READY_TOKEN) &&
      !transitioning
    ) {
      setTransitioning(true);
      router.push(`/s/${sessionCode}/verify`);
    }
  }, [status, lastAssistantText, transitioning, router, sessionCode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    sendMessage({ text });
    setInput("");
  };

  const cleanText = (text: string) => text.replace(READY_TOKEN, "").trim();

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("file", blob, "audio.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    if (!res.ok) return "";
    const { text } = (await res.json()) as { text: string };
    return text;
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="border-b px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          The question
        </p>
        <p className="mt-1 text-base leading-snug">{question}</p>
      </header>

      <Conversation>
        <ConversationContent>
          {messages.length === 0 && (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>
                  Take a moment with the question above. When you&apos;re ready,
                  share whatever comes up — a gut reaction, a concern, a hope.
                  There&apos;s no right answer here.
                </MessageResponse>
              </MessageContent>
            </Message>
          )}
          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent>
                {m.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={i}>{cleanText(part.text)}</MessageResponse>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <form
        onSubmit={submit}
        className="m-4 flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm"
      >
        <SpeechInput
          variant="ghost"
          size="icon"
          onTranscriptionChange={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
          onAudioRecorded={async (blob) => {
            const text = await transcribeAudio(blob);
            return text;
          }}
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder="Type or speak your reply…"
          rows={1}
          className="min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || status !== "ready"}
        >
          <ArrowUpIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
