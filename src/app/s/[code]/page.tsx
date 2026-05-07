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
    // The proxy normally creates an anonymous user before this Server Component
    // renders. If we got here without one, force a re-request so the proxy runs.
    redirect(`/s/${code}`);
  }

  const { session, participant } = await getOrCreateParticipant(code, user.id).catch(
    () => ({ session: null, participant: null }),
  );
  if (!session || !participant) notFound();

  if (participant.phase === "complete") redirect(`/s/${code}/themes`);
  if (participant.phase === "awaiting_verification") redirect(`/s/${code}/verify`);

  return <ChatClient sessionCode={session.id} question={session.question} />;
}
