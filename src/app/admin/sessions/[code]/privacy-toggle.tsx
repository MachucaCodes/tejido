"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InfoTip } from "@/components/info-tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Anonymous ↔ Connect as one labelled row. It changes what participants are
 * told and asked, so switching always asks first (like ArchiveToggle), and
 * the explanation lives in the tooltip and the confirm, not on the page.
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connect = privacy === "connect";
  const optIns = `${consentCount} opted in`;

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
    setOpen(false);
    router.refresh();
  }

  // Label, value and tip stay together; the action sits at the right of the
  // same line from sm up, and on its own line under them on a phone. Same
  // in StatusToggle and PrivacyToggle so the two rows match.
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
        <span className="text-muted-foreground">Privacy:</span>
        <span className="font-medium">{connect ? "Connect" : "Anonymous"}</span>
        {(connect || consentCount > 0) && (
          <span className="text-xs text-muted-foreground">· {optIns}</span>
        )}
        <InfoTip label="About privacy">
          {connect
            ? "Participants are told the organizers may connect them with neighbors who share their interests, and can opt in. The summary and themes stay anonymous."
            : "Nobody is asked to share their name. A Connect session lets participants opt in to being introduced to neighbors with similar interests."}
        </InfoTip>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setOpen(true)}
        >
          {connect ? "Make anonymous" : "Make it a Connect session"}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {connect ? "Make this session anonymous?" : "Make this a Connect session?"}
            </DialogTitle>
            <DialogDescription>
              {connect ? (
                <>
                  New participants are no longer asked whether they want to be
                  connected with neighbors.
                  {consentCount > 0 &&
                    ` The ${consentCount} earlier opt-in${consentCount === 1 ? " stays" : "s stay"} on file.`}
                </>
              ) : (
                <>
                  Participants are told the organizers may connect them with
                  neighbors who share their interests, and can opt in. The
                  summary and themes stay anonymous.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="button" disabled={busy} onClick={() => void toggle()}>
              {busy ? "Saving…" : connect ? "Make anonymous" : "Make it a Connect session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
