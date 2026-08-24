"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_ANALYSIS_PROMPT,
  DEFAULT_ANALYSIS_SYSTEM,
} from "@/lib/prompts/analysis";
import {
  DEFAULT_MECHANICS,
  DEFAULT_PACING,
  DEFAULT_PERSPECTIVES_INSTRUCTIONS,
  DEFAULT_TASK_FRAMING,
} from "@/lib/prompts/facilitator";
import {
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SUMMARY_SYSTEM,
} from "@/lib/prompts/summary";

type Status = "open" | "closed";

type PromptOverrides = {
  taskFraming: string;
  mechanics: string;
  pacing: string;
  perspectivesInstructions: string;
  analysisSystem: string;
  analysisPrompt: string;
  summarySystem: string;
  summaryPrompt: string;
};

type PromptFieldKey = keyof PromptOverrides;

type PromptFieldSpec = {
  key: PromptFieldKey;
  label: string;
  description: string;
  defaultValue: string;
  placeholders?: readonly string[];
  rows: number;
  // Maps the client-side key to the body field the PATCH route expects.
  bodyField:
    | "prompt_task_framing"
    | "prompt_mechanics"
    | "prompt_pacing"
    | "prompt_perspectives_instructions"
    | "prompt_analysis_system"
    | "prompt_analysis_prompt"
    | "prompt_summary_system"
    | "prompt_summary_prompt";
};

const PROMPT_FIELDS: PromptFieldSpec[] = [
  {
    key: "taskFraming",
    label: "Facilitator · task framing",
    description: "Opening role statement for the facilitator AI.",
    defaultValue: DEFAULT_TASK_FRAMING,
    rows: 5,
    bodyField: "prompt_task_framing",
  },
  {
    key: "mechanics",
    label: "Facilitator · mechanics",
    description:
      "The 77-line methodology block (YOUR APPROACH, TONE, WHAT NOT TO DO, STRUCTURE, [READY_TO_SHARE] semantics).",
    defaultValue: DEFAULT_MECHANICS,
    rows: 16,
    bodyField: "prompt_mechanics",
  },
  {
    key: "pacing",
    label: "Facilitator · pacing",
    description: "Target conversation length and shape.",
    defaultValue: DEFAULT_PACING,
    rows: 4,
    bodyField: "prompt_pacing",
  },
  {
    key: "perspectivesInstructions",
    label: "Facilitator · perspectives template",
    description:
      "Wraps the dynamic list of themes from other participants. Must keep the {PERSPECTIVES_LIST} placeholder.",
    defaultValue: DEFAULT_PERSPECTIVES_INSTRUCTIONS,
    placeholders: ["{PERSPECTIVES_LIST}"],
    rows: 10,
    bodyField: "prompt_perspectives_instructions",
  },
  {
    key: "analysisSystem",
    label: "Analyze · system prompt",
    description: "System message for the extract+cluster pass.",
    defaultValue: DEFAULT_ANALYSIS_SYSTEM,
    rows: 4,
    bodyField: "prompt_analysis_system",
  },
  {
    key: "analysisPrompt",
    label: "Analyze · user prompt template",
    description:
      "The full extraction + theme-weaving prompt. Must keep {TOPIC}, {THEMES_BLOCK}, and {TRANSCRIPT} placeholders.",
    defaultValue: DEFAULT_ANALYSIS_PROMPT,
    placeholders: ["{TOPIC}", "{THEMES_BLOCK}", "{TRANSCRIPT}"],
    rows: 18,
    bodyField: "prompt_analysis_prompt",
  },
  {
    key: "summarySystem",
    label: "Summarize · system prompt",
    description: "System message for the session-level summary pass.",
    defaultValue: DEFAULT_SUMMARY_SYSTEM,
    rows: 3,
    bodyField: "prompt_summary_system",
  },
  {
    key: "summaryPrompt",
    label: "Summarize · user prompt template",
    description:
      "The synthesis prompt. Must keep {TOPIC}, {THEMES_BLOCK}, and {SAMPLES_BLOCK} placeholders.",
    defaultValue: DEFAULT_SUMMARY_PROMPT,
    placeholders: ["{TOPIC}", "{THEMES_BLOCK}", "{SAMPLES_BLOCK}"],
    rows: 14,
    bodyField: "prompt_summary_prompt",
  },
];

export default function EditSessionForm({
  code,
  initialTopic,
  initialTopicEs,
  initialIntroMessage,
  initialIntroMessageEs,
  initialContext,
  initialInstructions,
  initialStatus,
  initialPromptOverrides,
}: {
  code: string;
  initialTopic: string;
  initialTopicEs: string;
  initialIntroMessage: string;
  initialIntroMessageEs: string;
  initialContext: string;
  initialInstructions: string;
  initialStatus: Status;
  initialPromptOverrides: PromptOverrides;
}) {
  const router = useRouter();
  const [newCode, setNewCode] = useState(code);
  const [topic, setTopic] = useState(initialTopic);
  const [introMessage, setIntroMessage] = useState(initialIntroMessage);
  // Spanish is normally written by the auto-translation. These are only sent
  // when edited by hand — sending them pins the value against overwriting.
  const [topicEs, setTopicEs] = useState(initialTopicEs);
  const [introMessageEs, setIntroMessageEs] = useState(initialIntroMessageEs);
  const [context, setContext] = useState(initialContext);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [promptOverrides, setPromptOverrides] =
    useState<PromptOverrides>(initialPromptOverrides);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const promptsDirty = PROMPT_FIELDS.some(
    (f) => promptOverrides[f.key] !== initialPromptOverrides[f.key],
  );
  const codeChanged = newCode !== code;
  const dirty =
    codeChanged ||
    topic !== initialTopic ||
    introMessage !== initialIntroMessage ||
    topicEs !== initialTopicEs ||
    introMessageEs !== initialIntroMessageEs ||
    context !== initialContext ||
    instructions !== initialInstructions ||
    status !== initialStatus ||
    promptsDirty;

  const updateOverride = (key: PromptFieldKey, value: string) => {
    setPromptOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side placeholder check so the round-trip isn't wasted.
    for (const f of PROMPT_FIELDS) {
      const value = promptOverrides[f.key].trim();
      if (!value || !f.placeholders) continue;
      const missing = f.placeholders.filter((p) => !value.includes(p));
      if (missing.length) {
        setError(`${f.label}: missing placeholder(s) ${missing.join(", ")}`);
        return;
      }
    }

    if (codeChanged && !newCode.trim()) {
      setError("Session code cannot be empty.");
      return;
    }

    setBusy(true);
    const body: Record<string, unknown> = {
      code: newCode,
      topic,
      intro_message: introMessage,
      context,
      instructions,
      status,
    };
    for (const f of PROMPT_FIELDS) {
      body[f.bodyField] = promptOverrides[f.key];
    }

    // Only send the Spanish when it was actually hand-edited. Sending it on
    // every save would pin it permanently and the auto-translation would never
    // run again after the first edit to a session.
    if (topicEs !== initialTopicEs) body.topic_es = topicEs;
    if (introMessageEs !== initialIntroMessageEs) {
      body.intro_message_es = introMessageEs;
    }

    const res = await fetch(`/api/admin/sessions/${code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setSavedAt(Date.now());

    // The code is the route segment, so a rename has to move the page with it.
    if (codeChanged) {
      router.replace(`/admin/sessions/${newCode}`);
      return;
    }
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="code">
          Session code
        </label>
        <input
          id="code"
          value={newCode}
          onChange={(e) =>
            setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
          }
          required
          className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Used in the join URL (/s/{newCode || "…"}).
        </p>
        {codeChanged && (
          <p className="text-xs text-amber-700">
            Renaming from <code className="font-mono">{code}</code>. Participants
            and their answers move with it, but any link or QR code pointing at{" "}
            <code className="font-mono">/s/{code}</code> will stop working.
          </p>
        )}
      </div>

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
        <label className="text-xs font-medium" htmlFor="topic-es">
          Topic · Español
        </label>
        <input
          id="topic-es"
          value={topicEs}
          onChange={(e) => setTopicEs(e.target.value)}
          placeholder="Auto-translated after you save. Edit to override."
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
        <label className="text-xs font-medium" htmlFor="intro-es">
          Intro message · Español
        </label>
        <textarea
          id="intro-es"
          value={introMessageEs}
          onChange={(e) => setIntroMessageEs(e.target.value)}
          rows={3}
          placeholder="Auto-translated after you save. Edit to override."
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

      <details className="rounded-md border bg-background/50">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium">
          Prompt overrides
          {promptsDirty && (
            <span className="ml-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
              unsaved
            </span>
          )}
        </summary>
        <div className="space-y-3 border-t px-3 py-3">
          <p className="text-xs text-muted-foreground">
            Each block shows the live prompt the LLM is currently receiving for
            this session — either the built-in default or a stored override.
            Click <b>Edit</b> to take ownership of the text for this session;
            the value is persisted on save. <b>Revert to default</b> drops the
            stored override and goes back to the built-in.
          </p>
          {PROMPT_FIELDS.map((f) => (
            <PromptOverrideField
              key={f.key}
              spec={f}
              value={promptOverrides[f.key]}
              initialValue={initialPromptOverrides[f.key]}
              onChange={(v) => updateOverride(f.key, v)}
            />
          ))}
        </div>
      </details>

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

function PromptOverrideField({
  spec,
  value,
  initialValue,
  onChange,
}: {
  spec: PromptFieldSpec;
  value: string;
  initialValue: string;
  onChange: (next: string) => void;
}) {
  // Local edit state — view-by-default, click Edit to switch to a textarea
  // that's pre-seeded with whatever the LLM is currently seeing (default
  // text when no override is stored). Saving the form persists the textarea
  // contents to the DB column, so editing a default-status field and then
  // saving promotes the displayed text into a stored override.
  const [editing, setEditing] = useState(false);
  const isCustom = value.trim().length > 0;
  const effectiveText = isCustom ? value : spec.defaultValue;
  const hadStoredOverride = initialValue.trim().length > 0;

  const startEdit = () => {
    if (!isCustom) onChange(spec.defaultValue);
    setEditing(true);
  };

  const cancelEdit = () => {
    onChange(initialValue);
    setEditing(false);
  };

  const revertToDefault = () => {
    onChange("");
    setEditing(false);
  };

  return (
    <details className="rounded border bg-background">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs">
        <span className="font-medium">{spec.label}</span>
        <span
          className={
            "ml-2 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide " +
            (isCustom
              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
              : "bg-muted text-muted-foreground")
          }
        >
          {isCustom ? "custom" : "default"}
        </span>
        {editing && (
          <span className="ml-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
            editing
          </span>
        )}
      </summary>
      <div className="space-y-2 border-t px-3 py-2">
        <p className="text-xs text-muted-foreground">{spec.description}</p>
        {editing ? (
          <>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={spec.rows}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed"
              spellCheck={false}
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded border bg-background px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-accent"
              >
                Cancel
              </button>
              {hadStoredOverride && (
                <button
                  type="button"
                  onClick={revertToDefault}
                  className="rounded border bg-background px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-accent"
                >
                  Revert to default
                </button>
              )}
              {spec.placeholders && (
                <span className="text-[10px] text-muted-foreground">
                  Required placeholders:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {spec.placeholders.join(" ")}
                  </code>
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Changes are persisted when you click <b>Save changes</b> at the
              bottom of the form.
            </p>
          </>
        ) : (
          <>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
              {effectiveText}
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startEdit}
                className="rounded border bg-background px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-accent"
              >
                Edit
              </button>
              {isCustom && (
                <button
                  type="button"
                  onClick={revertToDefault}
                  className="rounded border bg-background px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-accent"
                >
                  Revert to default
                </button>
              )}
              {spec.placeholders && (
                <span className="text-[10px] text-muted-foreground">
                  Template placeholders:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {spec.placeholders.join(" ")}
                  </code>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </details>
  );
}
