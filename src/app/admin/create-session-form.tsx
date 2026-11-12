"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SessionDraft } from "@/lib/session-builder";
import { InfoTip } from "@/components/info-tip";
import { Button } from "@/components/ui/button";

export const EMPTY_SESSION: SessionDraft = {
  code: "",
  topic: "",
  intro_message: "",
  context: "",
  instructions: "",
  prompt_summary_system: "",
};

// The one form on /admin/new. Controlled from the page, so the chat can fill
// it in and the organizer edits the same fields before creating.
export default function CreateSessionForm({
  values,
  onChange,
}: {
  values: SessionDraft;
  onChange: (next: SessionDraft) => void;
}) {
  const router = useRouter();
  const code = values.code;
  const topic = values.topic;
  const introMessage = values.intro_message ?? "";
  const context = values.context ?? "";
  const instructions = values.instructions ?? "";
  const summaryFocus = values.prompt_summary_system ?? "";
  const set = (key: keyof SessionDraft) => (value: string) => onChange({ ...values, [key]: value });
  const setCode = set("code");
  const setTopic = set("topic");
  const setIntroMessage = set("intro_message");
  const setContext = set("context");
  const setInstructions = set("instructions");
  const setSummaryFocus = set("prompt_summary_system");
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
    // Open the new session.
    router.push(`/admin/sessions/${code}?created=1`);
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
        <textarea
          id="q"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
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
          rows={4}
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
          rows={6}
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
