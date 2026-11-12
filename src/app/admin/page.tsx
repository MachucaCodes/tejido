import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import { voiceCountsBySession } from "@/lib/voice-counts";
import { SessionRow } from "./session-row";

// The one sessions list. Admins see every session; other organizers see the
// ones they created. Creating a session lives on its own page (/admin/new).
export default async function AdminHome() {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");
  const admin = createAdmin();
  let query = admin
    .from("sessions")
    .select("id, topic, status, created_at, archived_at")
    .order("created_at", { ascending: false });
  if (!guard.isAdmin) query = query.eq("created_by", guard.user.id);
  const [{ data: sessions, error }, voiceCounts] = await Promise.all([
    query,
    voiceCountsBySession(admin),
  ]);
  // Archived sessions are retired, not deleted: keep them apart and tagged so
  // nobody mistakes one for a live session, but findable to un-archive.
  const active = (sessions ?? []).filter((s) => !s.archived_at);
  const archived = (sessions ?? []).filter((s) => s.archived_at);

  return (
    <div className="space-y-6">
      {/* The admin bar's marked tab is the visible title; New session sits in it. */}
      <h1 className="sr-only">{guard.isAdmin ? "Sessions" : "Your sessions"}</h1>

      {/* A failed load must not look like an empty one, or an admin may
          re-create a session that is still there. */}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load sessions. Reload the page to try again.
        </p>
      ) : active.length === 0 && archived.length === 0 ? (
        <div data-sessions-empty className="space-y-3 rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
          <Link href="/admin/new" className={buttonVariants()}>
            New session
          </Link>
        </div>
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
