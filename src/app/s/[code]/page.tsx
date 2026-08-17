import { notFound } from "next/navigation";
import { after } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { getCurrentUser, getOrCreateParticipant } from "@/lib/participant";
import { regenerateSummaryIfStale } from "@/lib/summary";
import { createAdmin } from "@/lib/supabase/admin";
import ChatClient from "./chat-client";
import type { Theme } from "./themes-panel";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { user } = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-sm">
        <p className="font-medium">Couldn&apos;t start your session.</p>
        <p className="text-muted-foreground">
          Anonymous sign-ins must be enabled on the Supabase project. Open the
          Supabase dashboard → Authentication → Sign In / Providers → Anonymous
          Sign-Ins, and toggle it on.
        </p>
      </div>
    );
  }

  let session: Awaited<ReturnType<typeof getOrCreateParticipant>>["session"] | null = null;
  let participant: Awaited<ReturnType<typeof getOrCreateParticipant>>["participant"] | null = null;
  try {
    const res = await getOrCreateParticipant(code, user.id);
    session = res.session;
    participant = res.participant;
  } catch (err) {
    console.error("[s/[code]] getOrCreateParticipant failed:", err);
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-sm">
        <p className="font-medium">Couldn&apos;t load this session.</p>
        <p className="text-muted-foreground">
          {err instanceof Error ? err.message : String(err)}
        </p>
      </div>
    );
  }
  if (!session || !participant) notFound();

  const adminGuard = await requireAdmin();
  const isAdmin = adminGuard.ok;

  const admin = createAdmin();

  // Always rehydrate transcripts from the server so the conversation
  // survives device/cookie changes for phone-keyed users.
  const turnsPromise = admin
    .from("transcript_turns")
    .select("id, role, content, ord")
    .eq("participant_id", participant.id)
    .order("ord", { ascending: true });

  const analyzedPromise = admin
    .from("extracted_points")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", participant.id);

  const [
    turnsRes,
    analyzedRes,
    themesRes,
    assignmentsRes,
    summaryRes,
    pointsRes,
  ] = await Promise.all([
    turnsPromise,
    analyzedPromise,
    admin
      .from("themes")
      .select("id, short_name, description, created_at")
      .eq("session_id", code)
      .order("created_at", { ascending: true }),
    admin
      .from("theme_assignments")
      .select("theme_id, point_id, themes!inner(session_id)")
      .eq("themes.session_id", code),
    admin
      .from("sessions")
      .select("summary_text, summary_generated_at")
      .eq("id", code)
      .single(),
    admin
      .from("extracted_points")
      .select("id, surface_phrase, participant_id, participants!inner(session_id)")
      .eq("participants.session_id", code),
  ]);

  const initialHasAnalyzed = (analyzedRes.count ?? 0) > 0;

  const initialMessages: ChatMessage[] = (turnsRes.data ?? []).map((t) => ({
    id: String(t.id),
    role: t.role as "user" | "assistant",
    content: t.content,
  }));

  const initialThemes: Theme[] = (themesRes.data ?? []).map((t) => ({
    id: t.id,
    short_name: t.short_name,
    description: t.description,
  }));

  // Map each point to the themes it was assigned to. A point may have 0
  // (unclustered) or >1 theme. The drilldown shows points under each
  // theme; the outliers row picks from points whose only themes are in
  // the bottom half of the count distribution. Per-theme voice counts
  // are derived in the panel by deduping participant_id across each
  // theme's points — counting assignment rows over-counts participants
  // whose transcript produced multiple points under the same theme.
  const themeIdsByPoint: Record<string, string[]> = {};
  for (const a of assignmentsRes.data ?? []) {
    (themeIdsByPoint[a.point_id] ??= []).push(a.theme_id);
  }
  const initialPoints = (pointsRes.data ?? [])
    .map((p) => ({
      id: p.id,
      surface_phrase: (p.surface_phrase ?? "").trim(),
      theme_ids: themeIdsByPoint[p.id] ?? [],
      participant_id: p.participant_id,
    }))
    .filter((p) => p.surface_phrase.length > 0);

  const initialSummary = {
    text: summaryRes.data?.summary_text ?? null,
    generatedAt: summaryRes.data?.summary_generated_at ?? null,
  };

  // Fire-and-forget: after the response is sent, check whether the room's
  // share distribution has shifted enough (TV-distance on theme shares) to
  // warrant a fresh summary. Realtime delivers the update to viewers.
  if (initialHasAnalyzed) {
    after(async () => {
      try {
        await regenerateSummaryIfStale(code);
      } catch (err) {
        console.error("[s/[code]] summary regen failed:", err);
      }
    });
  }

  return (
    <ChatClient
      sessionCode={session.id}
      topic={session.topic}
      introMessage={session.intro_message}
      hasPhone={Boolean(user.phone)}
      initialHasAnalyzed={initialHasAnalyzed}
      initialMessages={initialMessages}
      initialThemes={initialThemes}
      initialSummary={initialSummary}
      initialPoints={initialPoints}
      isAdmin={isAdmin}
      archived={Boolean(session.archived_at)}
    />
  );
}
