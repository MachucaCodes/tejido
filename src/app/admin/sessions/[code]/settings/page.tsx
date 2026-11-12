import { notFound, redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import EditSessionForm from "../edit-session-form";
import PrivacyToggle from "../privacy-toggle";
import SessionHeader from "../session-header";
import StatusToggle from "../status-toggle";

/**
 * The session's settings on their own tab, so the Overview stays about the
 * results: status, privacy, the texts participants see and what the
 * facilitator is told.
 */
export default async function SessionSettings({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");
  const { code } = await params;
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, created_by, topic, topic_es, intro_message, intro_message_es, context, instructions, status, privacy, created_at, archived_at, prompt_task_framing, prompt_mechanics, prompt_pacing, prompt_perspectives_instructions, prompt_analysis_system, prompt_analysis_prompt, prompt_summary_system, prompt_summary_prompt",
    )
    .eq("id", code)
    .single();
  if (!session) notFound();
  if (!guard.isAdmin && session.created_by !== guard.user.id) notFound();

  // Admin-only, matching the PATCH route.
  let consentCount = 0;
  if (guard.isAdmin) {
    const { count } = await admin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", code)
      .not("connect_consent_at", "is", null);
    consentCount = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <SessionHeader session={session} current="settings" isAdmin={guard.isAdmin} />
      {/* Status and privacy each save on their own after a confirm, so they
          sit above the form rather than inside it. */}
      <section className="divide-y divide-border rounded-lg border bg-card px-4">
        <div className="py-2">
          <StatusToggle
            code={session.id}
            status={session.status === "closed" ? "closed" : "open"}
          />
        </div>
        {/* Admin-only, matching the PATCH route. */}
        {guard.isAdmin && (
          <div className="py-2">
            <PrivacyToggle
              code={session.id}
              privacy={session.privacy === "connect" ? "connect" : "anonymous"}
              consentCount={consentCount}
            />
          </div>
        )}
      </section>
      <EditSessionForm
        code={session.id}
        initialTopic={session.topic ?? ""}
        initialTopicEs={session.topic_es ?? ""}
        initialIntroMessage={session.intro_message ?? ""}
        initialIntroMessageEs={session.intro_message_es ?? ""}
        initialContext={session.context ?? ""}
        initialInstructions={session.instructions ?? ""}
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
    </div>
  );
}
