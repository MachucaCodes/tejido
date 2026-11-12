import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import { voiceCountsBySession } from "@/lib/voice-counts";
import { SessionRow } from "../session-row";

export default async function AdminSessionsList() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const admin = createAdmin();
  const [{ data: sessions }, voiceCounts] = await Promise.all([
    admin
      .from("sessions")
      .select("id, topic, status, created_at, archived_at")
      .order("created_at", { ascending: false }),
    voiceCountsBySession(admin),
  ]);

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
            <SessionRow key={s.id} session={s} count={voiceCounts.get(s.id) ?? 0} />
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
              <SessionRow
                key={s.id}
                session={s}
                count={voiceCounts.get(s.id) ?? 0}
                archived
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
