import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import EditSessionForm from "./edit-session-form";

export default async function AdminSessionDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");
  const { code } = await params;
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, topic, intro_message, context, instructions, status, created_at, prompt_task_framing, prompt_mechanics, prompt_pacing, prompt_perspectives_instructions, prompt_analysis_system, prompt_analysis_prompt, prompt_summary_system, prompt_summary_prompt",
    )
    .eq("id", code)
    .single();
  if (!session) notFound();

  const { data: participants } = await admin
    .from("participants")
    .select("id, phase, created_at, completed_at")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  const { data: themes } = await admin
    .from("themes")
    .select("id, short_name, description")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  const { data: assignments } = await admin
    .from("theme_assignments")
    .select("theme_id, point_id, themes!inner(session_id)")
    .eq("themes.session_id", code);

  const counts: Record<string, number> = {};
  for (const a of assignments ?? []) counts[a.theme_id] = (counts[a.theme_id] ?? 0) + 1;

  const phaseCounts = (participants ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.phase] = (acc[p.phase] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {session.id}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.status} · {new Date(session.created_at).toLocaleString()}
          </p>
        </div>
        <Link
          href={`/admin/sessions/${session.id}/logs`}
          className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
        >
          LLM logs →
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Edit session</h2>
        <EditSessionForm
          code={session.id}
          initialTopic={session.topic ?? ""}
          initialIntroMessage={session.intro_message ?? ""}
          initialContext={session.context ?? ""}
          initialInstructions={session.instructions ?? ""}
          initialStatus={session.status as "open" | "closed"}
          initialPromptOverrides={{
            taskFraming: session.prompt_task_framing ?? "",
            mechanics: session.prompt_mechanics ?? "",
            pacing: session.prompt_pacing ?? "",
            perspectivesInstructions: session.prompt_perspectives_instructions ?? "",
            analysisSystem: session.prompt_analysis_system ?? "",
            analysisPrompt: session.prompt_analysis_prompt ?? "",
            summarySystem: session.prompt_summary_system ?? "",
            summaryPrompt: session.prompt_summary_prompt ?? "",
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Participants</h2>
        <p className="text-sm">
          {(participants ?? []).length} total
          {Object.entries(phaseCounts).length > 0 && " — "}
          {Object.entries(phaseCounts)
            .map(([p, n]) => `${n} ${p.replace("_", " ")}`)
            .join(", ")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Themes</h2>
        {!themes || themes.length === 0 ? (
          <p className="text-sm text-muted-foreground/80">No themes yet.</p>
        ) : (
          <ul className="space-y-2">
            {themes.map((t) => (
              <li key={t.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{t.short_name}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {counts[t.id] ?? 0}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
