import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import { voiceCountsBySession } from "@/lib/voice-counts";
import CreateSessionForm from "./create-session-form";
import SessionBuilder from "./session-builder";
import { SessionRow } from "./session-row";

export default async function AdminHome() {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");
  const admin = createAdmin();
  let query = admin
    .from("sessions")
    .select("id, topic, status, created_at, archived_at")
    .order("created_at", { ascending: false });
  // Non-admin organizers only see the sessions they created.
  if (!guard.isAdmin) query = query.eq("created_by", guard.user.id);
  const [{ data: sessions }, voiceCounts] = await Promise.all([
    query,
    voiceCountsBySession(admin),
  ]);
  // Archived sessions are retired: keep them apart and dimmed, like
  // /admin/sessions, so nobody mistakes one for a live session.
  const active = (sessions ?? []).filter((s) => !s.archived_at);
  const archived = (sessions ?? []).filter((s) => s.archived_at);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-lg font-semibold">Create a session</h1>
        <SessionBuilder />
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Or fill in the form yourself
          </summary>
          <CreateSessionForm />
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {guard.isAdmin ? "All sessions" : "Your sessions"}
        </h2>
        {active.length === 0 && archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((s) => (
              <SessionRow key={s.id} session={s} count={voiceCounts.get(s.id) ?? 0} />
            ))}
          </ul>
        )}
      </section>

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
