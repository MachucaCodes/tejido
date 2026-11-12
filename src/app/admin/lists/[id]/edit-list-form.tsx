"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small "Edit" button for the list header. Name, description and delete live
 * in a dialog so the page itself is just the list and its members. Delete is
 * a quiet icon apart from Save and always asks first, inside the same dialog.
 */
export default function EditListForm({
  listId,
  name: initialName,
  description: initialDescription,
}: {
  listId: string;
  name: string;
  description: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Start from what is saved, not from an abandoned edit.
      setName(initialName);
      setDescription(initialDescription ?? "");
    }
    if (!next) {
      setConfirming(false);
      setError(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/lists/${listId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setOpen(false);
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/lists/${listId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `failed (${res.status})`);
      return;
    }
    router.push("/admin/lists");
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="xs" variant="ghost" className="text-muted-foreground" />}>
        <PencilIcon aria-hidden />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete “{initialName}”?</DialogTitle>
              <DialogDescription>
                The list is removed. Its numbers are kept and stay in any other lists.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void remove()}>
                {busy ? "Deleting…" : "Delete list"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={save} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Edit list</DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="list-name">
                Name
              </label>
              <input
                id="list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="list-description">
                Description
              </label>
              <input
                id="list-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {/* Same footer as New list: Cancel + Save on the right. Delete is a
                quiet icon on the far left, set apart from Save. */}
            <DialogFooter className="sm:justify-between">
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label="Delete list"
                  onClick={() => {
                    setError(null);
                    setConfirming(true);
                  }}
                  className="self-start rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive sm:self-center"
                >
                  <Trash2Icon className="size-4" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Delete list</TooltipContent>
              </Tooltip>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
