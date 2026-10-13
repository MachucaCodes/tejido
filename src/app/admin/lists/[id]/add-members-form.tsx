"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function AddMembersForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    const res = await fetch(`/api/admin/lists/${listId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, optedIn }),
    });
    setBusy(false);
    const body = res.headers.get("content-type")?.includes("json")
      ? ((await res.json()) as { added: number; invalid: string[] })
      : null;
    if (!res.ok && !body) {
      setError(await res.text());
      return;
    }
    const invalid = body?.invalid ?? [];
    // Keep the bad lines in the box so they can be fixed and re-added.
    setText(invalid.join("\n"));
    setResult(
      `Added ${body?.added ?? 0}.` +
        (invalid.length ? ` ${invalid.length} not valid — left in the box to fix.` : ""),
    );
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="numbers">
          Add numbers
        </label>
        <textarea
          id="numbers"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"+506 8888 7777, Ana, es\n8888 6666, Luis\n+1 415 555 0100, Sam, en"}
          className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          One per line: phone, then an optional name and language (en or es),
          separated by commas or tabs. Numbers without a + are read as Costa Rica.
          With no language, +506 numbers get Spanish and the rest English.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={optedIn}
          onChange={(e) => setOptedIn(e.target.checked)}
        />
        These people agreed to get WhatsApp messages from Tejido
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Adding…" : "Add to list"}
      </Button>
    </form>
  );
}
