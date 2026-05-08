import { notFound } from "next/navigation";

import { getCurrentUser, getOrCreateParticipant } from "@/lib/participant";
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

  const isComplete = participant.phase === "complete";
  const admin = createAdmin();

  // Always rehydrate transcripts from the server so the conversation
  // survives device/cookie changes for phone-keyed users.
  const turnsPromise = admin
    .from("transcript_turns")
    .select("id, role, content, ord")
    .eq("participant_id", participant.id)
    .order("ord", { ascending: true });

  const [turnsRes, themesRes, assignmentsRes] = await Promise.all([
    turnsPromise,
    isComplete
      ? admin
          .from("themes")
          .select("id, short_name, description, created_at")
          .eq("session_id", code)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; short_name: string; description: string; created_at: string }> }),
    isComplete
      ? admin
          .from("theme_assignments")
          .select("theme_id, themes!inner(session_id)")
          .eq("themes.session_id", code)
      : Promise.resolve({ data: [] as Array<{ theme_id: string }> }),
  ]);

  const initialMessages: ChatMessage[] = (turnsRes.data ?? []).map((t) => ({
    id: String(t.id),
    role: t.role as "user" | "assistant",
    content: t.content,
  }));

  const counts: Record<string, number> = {};
  for (const a of assignmentsRes.data ?? []) {
    counts[a.theme_id] = (counts[a.theme_id] ?? 0) + 1;
  }
  const initialThemes: Theme[] = (themesRes.data ?? []).map((t) => ({
    id: t.id,
    short_name: t.short_name,
    description: t.description,
    count: counts[t.id] ?? 0,
  }));

  return (
    <ChatClient
      sessionCode={session.id}
      topic={session.topic}
      introMessage={session.intro_message}
      hasPhone={Boolean(user.phone)}
      initialPhase={isComplete ? "complete" : "in_conversation"}
      initialMessages={initialMessages}
      initialThemes={initialThemes}
    />
  );
}
