import { notFound, redirect } from "next/navigation";

import { getCurrentUser, getOrCreateParticipant } from "@/lib/participant";
import ChatClient from "./chat-client";

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

  if (participant.phase === "complete") redirect(`/s/${code}/themes`);

  return (
    <ChatClient
      sessionCode={session.id}
      topic={session.topic}
      introMessage={session.intro_message}
      hasPhone={Boolean(user.phone)}
    />
  );
}
