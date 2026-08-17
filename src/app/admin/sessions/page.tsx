import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

export default async function AdminSessionsList() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const admin = createAdmin();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, topic, status, created_at, archived_at, participants:participants(count)")
    .order("created_at", { ascending: false });

  // Admin keeps sight of archived sessions — they're retired, not deleted, and
  // this is the only place to find one again to un-archive it.
  const active = (sessions ?? []).filter((s) => !s.archived_at);
  const archived = (sessions ?? []).filter((s) => s.archived_at);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Sessions</h1>
        <Link
          href="/admin"
          className="rounded border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
        >
          New session
        </Link>
      </header>

      {active.length === 0 && archived.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Archived ({archived.length})
          </h2>
          <ul className="space-y-2">
            {archived.map((s) => (
              <SessionRow key={s.id} session={s} archived />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type SessionListRow = {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  participants: unknown;
};

function SessionRow({
  session: s,
  archived = false,
}: {
  session: SessionListRow;
  archived?: boolean;
}) {
  const count =
    Array.isArray(s.participants) && s.participants.length
      ? (s.participants[0] as { count: number }).count
      : 0;
  return (
    <li>
      <Link
        href={`/admin/sessions/${s.id}`}
        className={`flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent ${
          archived ? "opacity-60" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="font-medium">{s.id}</p>
          <p className="truncate text-sm text-muted-foreground">{s.topic}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(s.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>
            {count} {count === 1 ? "participant" : "participants"}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5">
            {archived ? "archived" : s.status}
          </span>
        </div>
      </Link>
    </li>
  );
}
