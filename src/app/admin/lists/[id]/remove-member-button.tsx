"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveMemberButton({
  listId,
  contactId,
}: {
  listId: string;
  contactId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/admin/lists/${listId}/members`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
