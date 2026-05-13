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
    .select("id, topic, status, created_at, participants:participants(count)")
    .order("created_at", { ascending: false });

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

      {!sessions || sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const count =
              Array.isArray(s.participants) && s.participants.length
                ? (s.participants[0] as { count: number }).count
                : 0;
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.id}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.topic}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {count} {count === 1 ? "participant" : "participants"}
                    </span>
                    <span className="rounded bg-secondary px-2 py-0.5">
                      {s.status}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
