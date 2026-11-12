"use client";

import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Archive / un-archive as a small quiet icon in the page header. It always
 * asks first: the confirm names the session and its voices and says what
 * archiving does, so that explanation doesn't need to sit on the page.
 */
export default function ArchiveToggle({
  code,
  topic,
  archivedAt,
  voiceCount,
}: {
  code: string;
  topic: string;
  archivedAt: string | null;
  voiceCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archived = Boolean(archivedAt);
  const action = archived ? "Un-archive session" : "Archive session";
  const voices = `${voiceCount} ${voiceCount === 1 ? "voice" : "voices"}`;

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
    setOpen(false);
    router.refresh();
  }

  const Icon = archived ? ArchiveRestoreIcon : ArchiveIcon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Tooltip>
        <TooltipTrigger
          aria-label={action}
          onClick={() => setOpen(true)}
          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Icon className="size-4" aria-hidden />
        </TooltipTrigger>
        <TooltipContent>{action}</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {archived ? "Un-archive" : "Archive"} “{code}”?
          </DialogTitle>
          <DialogDescription>
            {topic && <span className="block font-medium text-foreground">{topic}</span>}
            {archived ? (
              <>
                It goes back on the landing page and takes responses again. Its{" "}
                {voices} and their transcripts are unchanged.
              </>
            ) : (
              <>
                It leaves the landing page and stops taking new responses, even
                mid-conversation. Nothing is deleted: its {voices}, transcripts
                and themes stay, and you can un-archive at any time.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            variant={archived ? "default" : "destructive"}
            disabled={busy}
            onClick={() => void toggle()}
          >
            {busy ? "Saving…" : archived ? "Un-archive" : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
