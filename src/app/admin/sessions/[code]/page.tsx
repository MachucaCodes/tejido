import { ChevronRight, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import { LoadError } from "../../load-error";
import ArchiveToggle from "./archive-toggle";
import PrivacyToggle from "./privacy-toggle";
import CopyJoinLink from "./copy-join-link";
import EditSessionForm from "./edit-session-form";
import SessionHeader from "./session-header";
import WhatsAppInvites, { type InviteList, type InviteRow } from "./whatsapp-invites";

async function loadSession(code: string) {
  const admin = createAdmin();
  const { data: session, error } = await admin
    .from("sessions")
    .select(
      "id, created_by, topic, topic_es, intro_message, intro_message_es, context, instructions, status, privacy, created_at, archived_at, prompt_task_framing, prompt_mechanics, prompt_pacing, prompt_perspectives_instructions, prompt_analysis_system, prompt_analysis_prompt, prompt_summary_system, prompt_summary_prompt",
    )
    .eq("id", code)
    .maybeSingle();
  // A malformed code (22P02) is a missing session; any other error is a
  // failed load, which must not read as "Session not found".
  if (error && error.code !== "22P02") return { session: null, failed: true as const };
  return { session, failed: false as const };
}

export default async function AdminSessionDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");
  const { code } = await params;
  const admin = createAdmin();

  const { session, failed } = await loadSession(code);
  if (failed) return <LoadError what="this session" />;
  if (!session) notFound();
  // Non-admins only reach sessions they created — and don't learn that others exist.
  if (!guard.isAdmin && session.created_by !== guard.user.id) notFound();

  // Voices = participants whose answers turned into at least one point —
  // the same count the room view shows. Opening the link alone doesn't count.
  const { data: voiceRows, error: voiceError } = await admin
    .from("participants")
    .select("id, extracted_points!inner(id)")
    .eq("session_id", code);
  // Without the count, the archive confirm and the Voices line would say 0.
  if (voiceError) return <LoadError what="this session" />;
  const voiceCount = voiceRows?.length ?? 0;

  return (
    <div className="space-y-8">
      <SessionHeader
        session={session}
        current="overview"
        isAdmin={guard.isAdmin}
        actions={
          <>
            {/* An archived session's link is dead: don't offer to share it. */}
            {!session.archived_at && (
              <>
                <CopyJoinLink code={session.id} />
                {/* Set apart: archiving changes what participants see. */}
                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              </>
            )}
            <ArchiveToggle
              code={session.id}
              topic={session.topic ?? ""}
              archivedAt={session.archived_at}
              voiceCount={voiceCount}
            />
          </>
        }
      />
      {/* The rest needs several queries: stream it in behind a skeleton so
          opening a session shows something at once. */}
      <Suspense fallback={<SessionBodySkeleton />}>
        <SessionBody session={session} isAdmin={guard.isAdmin} voiceCount={voiceCount} />
      </Suspense>
    </div>
  );
}

type SessionRowData = NonNullable<
  Awaited<ReturnType<typeof loadSession>>["session"]
>;

async function SessionBody({
  session,
  isAdmin,
  voiceCount,
}: {
  session: SessionRowData;
  isAdmin: boolean;
  voiceCount: number;
}) {
  const code = session.id;
  const admin = createAdmin();
  const guard = { isAdmin };

  const { data: participants, error: participantsError } = await admin
    .from("participants")
    .select("id, phase, created_at, completed_at, connect_consent_at")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  const { data: themes, error: themesError } = await admin
    .from("themes")
    .select("id, short_name, description")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  const { data: assignments, error: assignmentsError } = await admin
    .from("theme_assignments")
    .select("theme_id, point_id, themes!inner(session_id)")
    .eq("themes.session_id", code);

  const { data: listRows, error: listsError } = await admin
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

  const { data: inviteRows, error: invitesError } = await admin
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

  // Any failed query: one alert line, not "0 opened", "No themes yet." or an
  // empty invite list that could lead an admin to re-send or rebuild.
  if (participantsError || themesError || assignmentsError || listsError || invitesError) {
    return <LoadError what="this session" />;
  }

  const counts: Record<string, number> = {};
  for (const a of assignments ?? []) counts[a.theme_id] = (counts[a.theme_id] ?? 0) + 1;

  const phaseCounts = (participants ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.phase] = (acc[p.phase] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
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
        <h2 className="text-sm font-medium text-muted-foreground">
          Themes{themes && themes.length > 0 && ` · ${themes.length}`}
        </h2>
        {!themes || themes.length === 0 ? (
          <p className="text-sm text-muted-foreground/80">No themes yet.</p>
        ) : (
          // One line per theme so the titles scan and the actions below stay
          // close; the full description opens in place.
          <ul className="divide-y divide-border rounded-lg border bg-card">
            {[...themes]
              .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
              .map((t) => {
                const n = counts[t.id] ?? 0;
                return (
                  <li key={t.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                        <ChevronRight
                          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                          aria-hidden
                        />
                        <span className="min-w-0 font-medium sm:max-w-1/2 sm:shrink-0 sm:truncate">{t.short_name}</span>
                        <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground group-open:invisible sm:block">
                          {t.description}
                        </span>
                        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                          {n} {n === 1 ? "point" : "points"}
                        </span>
                      </summary>
                      <div className="space-y-2 px-3 pb-3 pl-9">
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                        {n > 0 && (
                          <Link
                            href={`/s/${code}/points?theme=${t.id}`}
                            // The participant-side points page has no admin nav;
                            // a new tab keeps this overview where it was.
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 text-xs underline underline-offset-2 hover:text-foreground"
                          >
                            See the {n} {n === 1 ? "point" : "points"}
                            <ExternalLinkIcon className="size-3" aria-hidden />
                          </Link>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {/* Invites go out through the shared WhatsApp number to the admins'
          contact lists, so only admins see (and can send) them. */}
      {guard.isAdmin && (
        <WhatsAppInvites
          code={session.id}
          open={session.status === "open" && !session.archived_at}
          archived={Boolean(session.archived_at)}
          lists={inviteLists}
          invites={invites}
        />
      )}

      {/* Collapsed so the results come first and edits are deliberate. */}
      <details className="space-y-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          Edit session
        </summary>
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
      </details>

      {/* Admin-only, matching the PATCH route. */}
      {guard.isAdmin && (
        <PrivacyToggle
          code={session.id}
          privacy={session.privacy === "connect" ? "connect" : "anonymous"}
          consentCount={
            (participants ?? []).filter((p) => p.connect_consent_at).length
          }
        />
      )}
    </>
  );
}

function SessionBodySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border bg-card p-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
