"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Status = "open" | "closed";

export default function EditSessionForm({
  code,
  initialTopic,
  initialIntroMessage,
  initialContext,
  initialInstructions,
  initialStatus,
}: {
  code: string;
  initialTopic: string;
  initialIntroMessage: string;
  initialContext: string;
  initialInstructions: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [introMessage, setIntroMessage] = useState(initialIntroMessage);
  const [context, setContext] = useState(initialContext);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    topic !== initialTopic ||
    introMessage !== initialIntroMessage ||
    context !== initialContext ||
    instructions !== initialInstructions ||
    status !== initialStatus;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/sessions/${code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic,
        intro_message: introMessage,
        context,
        instructions,
        status,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setSavedAt(Date.now());
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="topic">
          Topic
        </label>
        <input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="intro">
          Intro message
        </label>
        <textarea
          id="intro"
          value={introMessage}
          onChange={(e) => setIntroMessage(e.target.value)}
          rows={3}
          placeholder="Shown as the first assistant message. Leave blank for none."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="context">
          Context
        </label>
        <textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
          placeholder="Background facts the facilitator can share only if asked. Optional."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Surfaced to the facilitator AI as reference material; not shown to the
          participant unless they ask.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="instructions">
          Instructions
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          placeholder="Per-session guidance for the facilitator AI. e.g. 'Open warmly — this is a big change. Don't lead with a binary choice; invite anything that comes up.'"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Injected into the facilitator system prompt and takes precedence over
          the global mechanics.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="open">open</option>
          <option value="closed">closed</option>
        </select>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {savedAt && !dirty && (
          <span className="text-xs text-muted-foreground">Saved.</span>
        )}
      </div>
    </form>
  );
}
