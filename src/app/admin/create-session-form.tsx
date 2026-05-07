"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function CreateSessionForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, question }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setCode("");
    setQuestion("");
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
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          placeholder="commons-2026-05"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Lowercase, used in /s/&lt;code&gt; URLs.
        </p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="q">
          Question
        </label>
        <textarea
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create session"}
      </Button>
    </form>
  );
}
