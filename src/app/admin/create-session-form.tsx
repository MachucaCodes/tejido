"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InfoTip } from "@/components/info-tip";
import { Button } from "@/components/ui/button";

export default function CreateSessionForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [topic, setTopic] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [context, setContext] = useState("");
  const [instructions, setInstructions] = useState("");
  const [summaryFocus, setSummaryFocus] = useState("");
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
        prompt_summary_system: summaryFocus,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    // Same as the builder: open the new session.
    router.push(`/admin/sessions/${code}`);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium" htmlFor="slug">
            Link name
          </label>
          <InfoTip label="About the link name">
            Lowercase, no spaces. The join link is /s/&lt;link name&gt;.
          </InfoTip>
        </div>
        <input
          id="slug"
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          placeholder="commons-2026-05"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="q">
          Question people are asked
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
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium" htmlFor="intro">
            Intro message
          </label>
          <InfoTip label="About the intro message">
            Shown as the first message in the chat. Leave blank for the default.
          </InfoTip>
        </div>
        <textarea
          id="intro"
          value={introMessage}
          onChange={(e) => setIntroMessage(e.target.value)}
          rows={3}
          placeholder="Optional"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium" htmlFor="context">
            Context
          </label>
          <InfoTip label="About context">
            Background facts the facilitator AI can share only if a participant asks. Not shown otherwise.
          </InfoTip>
        </div>
        <textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
          placeholder="Optional"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium" htmlFor="instructions">
            Instructions
          </label>
          <InfoTip label="About instructions">
            Guidance for the facilitator AI in this session. Takes precedence over the general mechanics.
          </InfoTip>
        </div>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Optional"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium" htmlFor="summary-focus">
            Summary focus
          </label>
          <InfoTip label="About summary focus">
            Guidance for the AI that writes the session summary. Leave blank for the default.
          </InfoTip>
        </div>
        <textarea
          id="summary-focus"
          value={summaryFocus}
          onChange={(e) => setSummaryFocus(e.target.value)}
          rows={2}
          placeholder="Optional"
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
