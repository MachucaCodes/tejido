"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    // Two-step instead of a browser confirm() dialog.
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/lists/${listId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    router.push("/admin/lists");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">List settings</h2>
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
      <div className="flex items-center justify-between gap-2">
        <Button type="submit" disabled={busy}>
          Save
        </Button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="text-xs text-destructive hover:underline disabled:opacity-50"
        >
          {confirmDelete ? "Click again to delete this list" : "Delete list"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Deleting a list keeps the numbers — they stay in any other lists.
      </p>
    </form>
  );
}
