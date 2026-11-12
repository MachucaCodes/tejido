"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import type { BuilderMessage, SessionDraft } from "@/lib/session-builder";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";

const OPENER =
  "Hi! I'll help you set up a session. What do you want people to open up about?";

// The chat writes its draft into the page's one form (create-session-form.tsx);
// it has no form or Create button of its own.
export default function SessionBuilder({
  messages,
  setMessages,
  draft,
  onDraft,
}: {
  // Held by the page, which keeps them through a reload.
  messages: BuilderMessage[];
  setMessages: React.Dispatch<React.SetStateAction<BuilderMessage[]>>;
  // What the form holds now, so the chat builds on the organizer's edits.
  draft: SessionDraft | null;
  onDraft: (draft: SessionDraft) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setBusy(true);

    const history: BuilderMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    const updateLast = (patch: Partial<BuilderMessage>) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], ...patch };
        return next;
      });

    try {
      const res = await fetch("/api/admin/session-builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, currentDraft: draft }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text()) || "Something went wrong. Try again.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as {
            text?: string;
            draft?: SessionDraft;
            error?: string;
          };
          if (event.text) {
            reply += event.text;
            updateLast({ content: reply });
          }
          if (event.draft) {
            updateLast({ draft: event.draft });
            onDraft(event.draft);
          }
          if (event.error) setError(event.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      {/* Short while it only holds the greeting, so the form link below
          stays in view; full height once a conversation starts. */}
      <div
        className={`flex flex-col rounded-lg border bg-card ${
          messages.length === 0 ? "h-40" : "h-[28rem]"
        }`}
      >
        <Conversation className="flex-1">
          <ConversationContent>
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>{OPENER}</MessageResponse>
              </MessageContent>
            </Message>
            {messages.map((m, i) => (
              <Message key={i} from={m.role}>
                <MessageContent>
                  {m.content ? (
                    <MessageResponse>{m.content}</MessageResponse>
                  ) : m.draft ? (
                    // The model sometimes proposes without a word: say it here
                    // so the draft never arrives silently.
                    <MessageResponse>
                      {"Here's a draft in the form below. Edit anything, then Create session."}
                    </MessageResponse>
                  ) : (
                    <span className="text-muted-foreground">…</span>
                  )}
                  {m.draft && m.content && (
                    <p className="text-xs text-muted-foreground">Filled in the form below.</p>
                  )}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to hear about…"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            <ArrowUpIcon />
          </Button>
        </form>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
