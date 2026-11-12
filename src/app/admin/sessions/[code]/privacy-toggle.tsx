"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const explain = connect
    ? "Participants are told the organizers may connect them with neighbors who share their interests, and can opt in. The summary and themes stay anonymous."
    : "Nobody is asked to share their name. A Connect session lets participants opt in to being introduced to neighbors with similar interests.";

  return (
    <section className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-sm font-medium">
            {connect ? "Connect session" : "Anonymous session"}
          </h2>
          <Tooltip>
            <TooltipTrigger
              aria-label={explain}
              className="text-muted-foreground hover:text-foreground"
            >
              <InfoIcon className="size-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{explain}</TooltipContent>
          </Tooltip>
          {consentCount > 0 && (
            <span className="text-xs text-muted-foreground">
              · {consentCount} opted in{connect ? "" : " earlier"}
            </span>
          )}
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
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
