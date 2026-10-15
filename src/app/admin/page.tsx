import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import { voiceCountsBySession } from "@/lib/voice-counts";
import CreateSessionForm from "./create-session-form";
import SessionBuilder from "./session-builder";

export default async function AdminHome() {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");
  const admin = createAdmin();
  let query = admin
    .from("sessions")
    .select("id, topic, status, created_at")
    .order("created_at", { ascending: false });
  // Non-admin organizers only see the sessions they created.
  if (!guard.isAdmin) query = query.eq("created_by", guard.user.id);
  const [{ data: sessions }, voiceCounts] = await Promise.all([
    query,
    voiceCountsBySession(admin),
  ]);

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
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const count = voiceCounts.get(s.id) ?? 0;
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
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {count} {count === 1 ? "voice" : "voices"}
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
      </section>
    </div>
  );
}
