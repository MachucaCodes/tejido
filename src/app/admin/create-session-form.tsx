"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import type { SessionDraft } from "@/lib/session-builder";
import { InfoTip } from "@/components/info-tip";
import { toLinkName, type CreateSessionError } from "@/lib/link-name";
import { Button } from "@/components/ui/button";

const noop = () => () => {};

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
  onCreated,
}: {
  values: SessionDraft;
  onChange: (next: SessionDraft) => void;
  // Called once the session exists, before the page moves to it.
  onCreated?: () => void;
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
  const [error, setError] = useState<CreateSessionError | null>(null);
  // The origin comes from the browser, so the link shown matches where the
  // admin is (localhost, a preview, production), as in copy-join-link.tsx.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/sessions", {
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
    } catch {
      setBusy(false);
      setError({ error: "Couldn't reach the server. Check your connection and try again." });
      return;
    }
    if (!res.ok) {
      // Only a refusal turns Create back on. On success it stays off while
      // the new session's page loads, so a second click can't hit
      // "already used".
      setBusy(false);
      const body = (await res.json().catch(() => null)) as CreateSessionError | null;
      setError(body?.error ? body : { error: "Couldn't create the session. Try again." });
      return;
    }
    onCreated?.();
    // Open the new session.
    router.push(`/admin/sessions/${code}?created=1`);
  };

  const fieldError = (field: CreateSessionError["field"]) =>
    error && error.field === field ? (
      <p id={`${field}-error`} className="text-xs text-destructive">
        {error.error}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium" htmlFor="slug">
            Link name
          </label>
          <InfoTip label="About the link name">
            The end of the join link. Spaces become hyphens.
          </InfoTip>
        </div>
        <input
          id="slug"
          value={code}
          onChange={(e) => {
            setCode(toLinkName(e.target.value));
            if (error?.field === "code") setError(null);
          }}
          placeholder="commons-2026-05"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-invalid={error?.field === "code" || undefined}
          aria-describedby={error?.field === "code" ? "code-error" : "join-url"}
          required
        />
        {fieldError("code") ?? (
          <p id="join-url" className="truncate text-xs text-muted-foreground">
            {origin}/s/{code || "…"}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="q">
          Question people are asked
        </label>
        <textarea
          id="q"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            if (error?.field === "topic") setError(null);
          }}
          rows={2}
          className="field-sizing-content min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-invalid={error?.field === "topic" || undefined}
          aria-describedby={error?.field === "topic" ? "topic-error" : undefined}
          required
        />
        {fieldError("topic")}
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
          className="field-sizing-content min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
          className="field-sizing-content min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
          className="field-sizing-content min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
          className="field-sizing-content min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && !error.field && <p className="text-xs text-destructive">{error.error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create session"}
      </Button>
    </form>
  );
}
