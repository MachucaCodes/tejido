"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Rebuilds the summary (an AI call). `compact` is the small outline header
 * action used when every answer is already in the latest summary.
 */
export default function RebuildButton({ code, compact = false }: { code: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rebuild() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${code}/summary`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `failed (${res.status})`);
      return;
    }
    const result = (await res.json()) as { regenerated: boolean; reason: string };
    if (!result.regenerated) {
      setError(`Not rebuilt: ${result.reason.replaceAll("_", " ")}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className={compact ? "flex flex-col items-end gap-1" : "space-y-1"}>
      <Button size="sm" variant={compact ? "outline" : "default"} onClick={rebuild} disabled={busy}>
        {busy ? "Rebuilding… (about a minute)" : compact ? "Rebuild" : "Rebuild summary now"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
