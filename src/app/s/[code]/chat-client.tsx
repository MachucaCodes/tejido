"use client";

import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Button } from "@/components/ui/button";

import { PhoneGate } from "./phone-gate";

const READY_TOKEN = "[READY_FOR_RESULTS]";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Status = "idle" | "streaming" | "error";

function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatClient({
  sessionCode,
  topic,
  introMessage,
  hasPhone,
}: {
  sessionCode: string;
  topic: string;
  introMessage: string | null;
  hasPhone: boolean;
}) {
  const intro = introMessage?.trim() ?? "";
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const storageKey = `tejido:s:${sessionCode}:msgs`;
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
    hydrated.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (messages.length === 0) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  const lastAssistantText =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const ready = lastAssistantText.includes(READY_TOKEN);
  const showPhoneGate = ready && !hasPhone && status !== "streaming";

  const send = useCallback(
    async (text: string) => {
      if (status === "streaming") return;
      const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
      const assistantId = newId();
      const next = [...messages, userMsg];
      setMessages([...next, { id: assistantId, role: "assistant", content: "" }]);
      setStatus("streaming");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionCode,
            messages: next.map(({ role, content }) => ({ role, content })),
          }),
        });
        if (!res.ok || !res.body) {
          setStatus("error");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          );
        }
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [messages, sessionCode, status],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void send(text);
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
          The topic
        </p>
        <p className="mt-1 text-base leading-snug">{topic}</p>
      </header>

      <Conversation>
        <ConversationContent>
          {intro && (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>{intro}</MessageResponse>
              </MessageContent>
            </Message>
          )}
          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent>
                <MessageResponse>{cleanText(m.content)}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="m-4">
        {showPhoneGate ? (
          <PhoneGate
            sessionCode={sessionCode}
            onComplete={() => {
              try {
                window.localStorage.removeItem(storageKey);
              } catch {}
              router.push(`/s/${sessionCode}/themes`);
              router.refresh();
            }}
          />
        ) : (
          <form
            onSubmit={submit}
            className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm"
          >
            <SpeechInput
              variant="ghost"
              size="icon"
              onTranscriptionChange={(t) =>
                setInput((prev) => (prev ? `${prev} ${t}` : t))
              }
              onAudioRecorded={transcribeAudio}
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
              disabled={!input.trim() || status === "streaming"}
            >
              <ArrowUpIcon className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
