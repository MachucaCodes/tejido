import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import ArchiveToggle from "./archive-toggle";
import CopyJoinLink from "./copy-join-link";
import EditSessionForm from "./edit-session-form";
import WhatsAppInvites, { type InviteList, type InviteRow } from "./whatsapp-invites";

export default async function AdminSessionDetail({
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
      "id, created_by, topic, topic_es, intro_message, intro_message_es, context, instructions, status, created_at, archived_at, prompt_task_framing, prompt_mechanics, prompt_pacing, prompt_perspectives_instructions, prompt_analysis_system, prompt_analysis_prompt, prompt_summary_system, prompt_summary_prompt",
    )
    .eq("id", code)
    .single();
  if (!session) notFound();
  // Non-admins only reach sessions they created — and don't learn that others exist.
  if (!guard.isAdmin && session.created_by !== guard.user.id) notFound();

  const { data: participants } = await admin
    .from("participants")
    .select("id, phase, created_at, completed_at")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  // Voices = participants whose answers turned into at least one point —
  // the same count the room view shows. Opening the link alone doesn't count.
  const { data: voiceRows } = await admin
    .from("participants")
    .select("id, extracted_points!inner(id)")
    .eq("session_id", code);
  const voiceCount = voiceRows?.length ?? 0;

  const { data: themes } = await admin
    .from("themes")
    .select("id, short_name, description")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  const { data: assignments } = await admin
    .from("theme_assignments")
    .select("theme_id, point_id, themes!inner(session_id)")
    .eq("themes.session_id", code);

  const { data: listRows } = await admin
    .from("lists")
    .select("id, name, list_members(contact_id)")
    .order("name", { ascending: true })
    .overrideTypes<
      { id: string; name: string; list_members: { contact_id: string }[] }[],
      { merge: false }
    >();
  const inviteLists: InviteList[] = (listRows ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    members: l.list_members.length,
  }));

  const { data: inviteRows } = await admin
    .from("session_invites")
    .select("id, status, error_message, sent_at, contacts(phone, name)")
    .eq("session_id", code)
    .overrideTypes<
      {
        id: string;
        status: string;
        error_message: string | null;
        sent_at: string | null;
        contacts: { phone: string; name: string | null } | null;
      }[],
      { merge: false }
    >();
  const invites: InviteRow[] = (inviteRows ?? []).map((i) => ({
    id: i.id,
    phone: i.contacts?.phone ?? "",
    name: i.contacts?.name ?? null,
    status: i.status,
    error: i.error_message,
    sentAt: i.sent_at,
  }));

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
            {session.archived_at ? "archived" : session.status} ·{" "}
            {new Date(session.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyJoinLink code={session.id} />
          <Link
            href={`/admin/sessions/${session.id}/synthesis`}
            className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
          >
            Synthesis history →
          </Link>
          {guard.isAdmin && (
            <Link
              href={`/admin/sessions/${session.id}/logs`}
              className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
            >
              LLM logs →
            </Link>
          )}
        </div>
      </header>

      {/* Invites go out through the shared WhatsApp number to the admins'
          contact lists, so only admins see (and can send) them. */}
      {guard.isAdmin && (
        <WhatsAppInvites
          code={session.id}
          open={session.status === "open" && !session.archived_at}
          lists={inviteLists}
          invites={invites}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Edit session</h2>
        <EditSessionForm
          code={session.id}
          initialTopic={session.topic ?? ""}
          initialTopicEs={session.topic_es ?? ""}
          initialIntroMessage={session.intro_message ?? ""}
          initialIntroMessageEs={session.intro_message_es ?? ""}
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

      <ArchiveToggle
        code={session.id}
        archivedAt={session.archived_at}
        participantCount={voiceCount}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Voices</h2>
        <p className="text-sm">
          {voiceCount} {voiceCount === 1 ? "voice" : "voices"} — people whose
          answers turned into points
        </p>
        <p className="text-xs text-muted-foreground">
          {(participants ?? []).length} opened the link
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
