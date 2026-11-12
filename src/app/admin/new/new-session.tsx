"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { BuilderMessage, SessionDraft } from "@/lib/session-builder";
import CreateSessionForm, { EMPTY_SESSION } from "../create-session-form";
import SessionBuilder from "../session-builder";

type Saved = { messages: BuilderMessage[]; values: SessionDraft; formOpen: boolean };

const noop = () => () => {};

function storageKey(userId: string) {
  return `tejido:new-session:${userId}`;
}

// The chat and the form are kept in this tab's sessionStorage, per signed-in
// user, so a reload or a look at the sessions list doesn't lose them.
// Cleared once the session is created.
function loadSaved(userId: string): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return {
      // A reply cut off by the reload has nothing in it: drop it.
      messages: (saved.messages ?? []).filter((m) => m.role === "user" || m.content || m.draft),
      values: { ...EMPTY_SESSION, ...saved.values },
      formOpen: Boolean(saved.formOpen),
    };
  } catch {
    // Storage blocked or unreadable: start fresh.
    return null;
  }
}

// One form, one Create. The chat fills the form in; the organizer edits the
// same fields and creates from there. Before a draft, the form stays behind a
// link for anyone who'd rather type it themselves.
export default function NewSession({ userId }: { userId: string }) {
  // Saved work lives in the browser: render once it's readable, so the first
  // render already holds it.
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  if (!inBrowser) return null;
  return <NewSessionInner userId={userId} />;
}

function NewSessionInner({ userId }: { userId: string }) {
  const [saved] = useState(() => loadSaved(userId));
  const [messages, setMessages] = useState<BuilderMessage[]>(saved?.messages ?? []);
  const [values, setValues] = useState<SessionDraft>(saved?.values ?? EMPTY_SESSION);
  const [formOpen, setFormOpen] = useState(saved?.formOpen ?? false);
  // Bumped each time the chat fills the form, to bring the form into view.
  const [filled, setFilled] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const key = storageKey(userId);
  // Off once the session is created, so nothing is saved back on the way out.
  const keep = useRef(true);

  const touched = Object.values(values).some((v) => v && v.trim());

  useEffect(() => {
    if (!keep.current) return;
    try {
      if (messages.length === 0 && !touched) window.sessionStorage.removeItem(key);
      else {
        const next: Saved = { messages, values, formOpen };
        window.sessionStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // Storage full or blocked: the page still works, it just won't survive a reload.
    }
  }, [key, messages, values, formOpen, touched]);

  useEffect(() => {
    if (filled) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filled]);

  const clearSaved = () => {
    keep.current = false;
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <SessionBuilder
        messages={messages}
        setMessages={setMessages}
        draft={touched ? values : null}
        onDraft={(draft) => {
          setValues({ ...EMPTY_SESSION, ...draft });
          setFormOpen(true);
          setFilled((n) => n + 1);
        }}
      />
      {formOpen ? (
        // scroll-mt clears the sticky site header and admin bar.
        <div ref={formRef} className="scroll-mt-32">
          <CreateSessionForm values={values} onChange={setValues} onCreated={clearSaved} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Or fill in the form yourself
        </button>
      )}
    </div>
  );
}
