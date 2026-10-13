"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export type InviteList = { id: string; name: string; members: number };
export type InviteRow = {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
};

const STATUS_ORDER = ["accepted", "sent", "declined", "failed", "pending"];

export default function WhatsAppInvites({
  code,
  open,
  lists,
  invites,
}: {
  code: string;
  open: boolean;
  lists: InviteList[];
  invites: InviteRow[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/admin/sessions/${code}/invites`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listIds: [...picked] }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `failed (${res.status})`);
      return;
    }
    const r = (await res.json()) as {
      sent: number;
      failed: number;
      alreadyInvited: number;
    };
    setResult(
      [
        `Sent ${r.sent}`,
        r.failed && `${r.failed} failed`,
        r.alreadyInvited && `${r.alreadyInvited} already invited`,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    setPicked(new Set());
    router.refresh();
  }

  const counts = invites.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});
  const sorted = [...invites].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Send on WhatsApp</h2>
        <p className="text-xs text-muted-foreground">
          Sends the invite template to everyone on the lists you pick. A number on
          several lists gets one invite.
        </p>
      </div>

      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No lists yet. <Link href="/admin/lists" className="underline">Create one</Link>.
        </p>
      ) : (
        <ul className="space-y-1">
          {lists.map((l) => (
            <li key={l.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={picked.has(l.id)}
                  onChange={() => toggle(l.id)}
                  disabled={!open}
                />
                <span>{l.name}</span>
                <span className="text-xs text-muted-foreground">
                  {l.members} {l.members === 1 ? "number" : "numbers"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {!open && (
        <p className="text-xs text-muted-foreground">Open the session to send invites.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
      <Button onClick={send} disabled={busy || !open || picked.size === 0}>
        {busy ? "Sending…" : "Send invites"}
      </Button>

      {invites.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            {STATUS_ORDER.filter((s) => counts[s])
              .map((s) => `${counts[s]} ${s}`)
              .join(" · ")}
          </p>
          <ul className="max-h-72 divide-y overflow-y-auto rounded border text-sm">
            {sorted.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <div className="min-w-0">
                  <span className="font-mono">{i.phone}</span>
                  {i.name && <span className="ml-2 text-xs text-muted-foreground">{i.name}</span>}
                  {i.error && (
                    <p className="truncate text-xs text-destructive" title={i.error}>
                      {i.error}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs">{i.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
