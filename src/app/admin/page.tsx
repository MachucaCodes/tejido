import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import CreateSessionForm from "./create-session-form";

export default async function AdminHome() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");
  const admin = createAdmin();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, question, status, created_at, participants:participants(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-lg font-semibold">Create a session</h1>
        <CreateSessionForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">All sessions</h2>
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
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/sessions/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.id}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {count} {count === 1 ? "participant" : "participants"}
                    </span>
                    <span className="rounded bg-secondary px-2 py-0.5">
                      {s.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
