"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Anonymous ↔ Connect. Separate from EditSessionForm for the same reason as
 * ArchiveToggle: it changes what participants are told and asked, so it
 * shouldn't ride along with a topic edit.
 */
export default function PrivacyToggle({
  code,
  privacy,
  consentCount,
}: {
  code: string;
  privacy: "anonymous" | "connect";
  consentCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connect = privacy === "connect";

  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ privacy: connect ? "anonymous" : "connect" }),
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
          {connect ? "Connect session" : "Anonymous session"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {connect ? (
            <>
              Participants are told the organizers may connect them with
              neighbors who share their interests, and can opt in. The summary
              and themes stay anonymous.{" "}
              {consentCount === 1
                ? "1 person has"
                : `${consentCount} people have`}{" "}
              opted in so far (<code>participants.connect_consent_at</code>).
            </>
          ) : (
            <>
              Nobody is asked to share their name. Switch to a Connect session
              to let participants opt in to being introduced to neighbors with
              similar interests.
              {consentCount > 0 &&
                ` ${consentCount} earlier opt-in${consentCount === 1 ? "" : "s"} still on file.`}
            </>
          )}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void toggle()}
      >
        {busy ? "Saving…" : connect ? "Make anonymous" : "Make it a Connect session"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
