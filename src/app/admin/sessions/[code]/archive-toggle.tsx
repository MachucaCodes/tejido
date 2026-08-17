"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Archive / un-archive control. Deliberately separate from EditSessionForm:
 * this is a state change with a visible consequence for participants, not
 * another field to save alongside the topic.
 */
export default function ArchiveToggle({
  code,
  archivedAt,
  participantCount,
}: {
  code: string;
  archivedAt: string | null;
  participantCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archived = Boolean(archivedAt);

  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">
          {archived ? "Archived" : "Archive session"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {archived ? (
            <>
              Archived {new Date(archivedAt as string).toLocaleString()}. Hidden
              from the landing page and read-only for participants. All{" "}
              {participantCount}{" "}
              {participantCount === 1 ? "response" : "responses"} and their
              transcripts are untouched.
            </>
          ) : (
            <>
              Removes this session from the landing page and stops it taking new
              responses. Nothing is deleted — the{" "}
              {participantCount === 1
                ? "1 response"
                : `${participantCount} responses`}
              , transcripts and themes stay, and you can un-archive at any time.
            </>
          )}
        </p>
      </div>

      <Button
        type="button"
        variant={archived ? "default" : "outline"}
        size="sm"
        disabled={busy}
        onClick={() => void toggle()}
      >
        {busy ? "Saving…" : archived ? "Un-archive" : "Archive"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
