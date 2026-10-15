"use client";

import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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

const FIELDS: { key: keyof SessionDraft; label: string; rows: number }[] = [
  { key: "code", label: "Slug", rows: 1 },
  { key: "topic", label: "Topic", rows: 2 },
  { key: "intro_message", label: "Intro message", rows: 4 },
  { key: "context", label: "Context (shared only if asked)", rows: 4 },
  { key: "instructions", label: "Instructions", rows: 6 },
  { key: "prompt_summary_system", label: "Summary focus", rows: 2 },
];

export default function SessionBuilder() {
  const router = useRouter();
  const [messages, setMessages] = useState<BuilderMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [creating, setCreating] = useState(false);
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
      if (!res.ok || !res.body) throw new Error(await res.text());

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
            setDraft(event.draft);
          }
          if (event.error) setError(event.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setBusy(false);
  };

  const create = async () => {
    if (!draft) return;
    setError(null);
    setCreating(true);
    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setCreating(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    router.push(`/admin/sessions/${draft.code}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex h-[28rem] flex-col rounded-lg border bg-card">
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
                  ) : m.draft ? null : (
                    <span className="text-muted-foreground">…</span>
                  )}
                  {m.draft && (
                    <p className="text-xs text-muted-foreground">Draft updated below.</p>
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

      {draft && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Draft session</p>
          {FIELDS.map(({ key, label, rows }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium" htmlFor={`draft-${key}`}>
                {label}
              </label>
              <textarea
                id={`draft-${key}`}
                value={draft[key] ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [key]:
                      key === "code"
                        ? e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                        : e.target.value,
                  })
                }
                rows={rows}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <Button onClick={create} disabled={creating || !draft.code || !draft.topic}>
            {creating ? "Creating…" : "Create session"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
