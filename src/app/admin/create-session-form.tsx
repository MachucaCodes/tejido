"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function CreateSessionForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [topic, setTopic] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [context, setContext] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        topic,
        intro_message: introMessage,
        context,
        instructions,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setCode("");
    setTopic("");
    setIntroMessage("");
    setContext("");
    setInstructions("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="slug">
          Slug
        </label>
        <input
          id="slug"
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          placeholder="commons-2026-05"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Lowercase, used in /s/&lt;slug&gt; URLs.
        </p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="q">
          Topic
        </label>
        <input
          id="q"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
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
          placeholder="Shown as the first message in the chat. Leave blank for the default."
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
          rows={4}
          placeholder="Per-session guidance for the facilitator AI. Takes precedence over the general mechanics."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create session"}
      </Button>
    </form>
  );
}
