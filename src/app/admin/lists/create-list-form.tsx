"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function CreateListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const { id } = (await res.json()) as { id: string };
    router.push(`/admin/lists/${id}`);
  };

  return (
    <form onSubmit={submit} className="flex items-start gap-2 rounded-lg border bg-card p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <input
          aria-label="New list name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New list name, e.g. Tech group"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create list"}
      </Button>
    </form>
  );
}
