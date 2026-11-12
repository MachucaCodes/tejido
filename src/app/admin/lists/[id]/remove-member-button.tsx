"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Per-member "…" menu. Remove sits inside it and takes two clicks (the same
 * two-step confirm EditListForm uses for Delete list), so a stray click on a
 * row can't drop someone from the list.
 */
export default function RemoveMemberButton({
  listId,
  contactId,
}: {
  listId: string;
  contactId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/lists/${listId}/members`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    setBusy(false);
    setConfirm(false);
    if (!res.ok) {
      setError("Couldn't remove");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) setConfirm(false);
        }}
      >
        <DropdownMenuTrigger
          aria-label="Member actions"
          disabled={busy}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          <DropdownMenuItem
            variant="destructive"
            closeOnClick={confirm}
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy
              ? "Removing…"
              : confirm
                ? "Click again to remove"
                : "Remove from list"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
