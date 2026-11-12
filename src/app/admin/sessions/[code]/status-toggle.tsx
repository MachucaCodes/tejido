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
 * Open ↔ closed as one labelled row, built like PrivacyToggle: it saves on
 * its own, so it never waits on the edit form's Save. Closing asks first;
 * reopening is harmless and saves at once.
 */
export default function StatusToggle({
  code,
  status,
}: {
  code: string;
  status: "open" | "closed";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = status === "open";

  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: isOpen ? "closed" : "open" }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `failed (${res.status})`);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Status:</span>
      <span className="font-medium">{isOpen ? "Open" : "Closed"}</span>
      <InfoTip label="About status">
        {isOpen
          ? "Open sessions take new answers."
          : "Closed sessions don't take new answers. Reopen to take them again."}
      </InfoTip>

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
          disabled={busy}
          onClick={() => (isOpen ? setOpen(true) : void toggle())}
        >
          {!isOpen && busy ? "Saving…" : isOpen ? "Close session" : "Reopen session"}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this session?</DialogTitle>
            <DialogDescription>
              It stops taking new answers. Everything said so far stays, and you
              can reopen it at any time.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="button" disabled={busy} onClick={() => void toggle()}>
              {busy ? "Saving…" : "Close session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reopening has no dialog, so its error shows on the row. */}
      {!isOpen && error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}
