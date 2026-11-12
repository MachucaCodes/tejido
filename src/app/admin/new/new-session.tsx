"use client";

import { useEffect, useRef, useState } from "react";

import type { SessionDraft } from "@/lib/session-builder";
import CreateSessionForm, { EMPTY_SESSION } from "../create-session-form";
import SessionBuilder from "../session-builder";

// One form, one Create. The chat fills the form in; the organizer edits the
// same fields and creates from there. Before a draft, the form stays behind a
// link for anyone who'd rather type it themselves.
export default function NewSession() {
  const [values, setValues] = useState<SessionDraft>(EMPTY_SESSION);
  const [formOpen, setFormOpen] = useState(false);
  // Bumped each time the chat fills the form, to bring the form into view.
  const [filled, setFilled] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filled) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filled]);

  const touched = Object.values(values).some((v) => v && v.trim());

  return (
    <div className="space-y-4">
      <SessionBuilder
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
          <CreateSessionForm values={values} onChange={setValues} />
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
