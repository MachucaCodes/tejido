"use client";

import { Trash2Icon } from "lucide-react";
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
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    setDeleteError(null);
    const res = await fetch(`/api/admin/lists/${listId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setDeleteError((await res.text()) || `failed (${res.status})`);
      return;
    }
    router.push("/admin/lists");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">List settings</h2>
        {/* Delete sits apart from Save, as a quiet icon that always asks first. */}
        <Dialog
          open={confirmOpen}
          onOpenChange={(next) => {
            setConfirmOpen(next);
            if (!next) setDeleteError(null);
          }}
        >
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label="Delete list"
              onClick={() => setConfirmOpen(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <Trash2Icon className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent>Delete list</TooltipContent>
          </Tooltip>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{initialName}”?</DialogTitle>
              <DialogDescription>
                The list is removed. Its numbers are kept and stay in any other
                lists.
              </DialogDescription>
            </DialogHeader>
            {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Deleting…" : "Delete list"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
      <div>
        <Button type="submit" disabled={busy}>
          Save
        </Button>
      </div>
    </form>
  );
}
