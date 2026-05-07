import { notFound, redirect } from "next/navigation";

import VerifyClient from "./verify-client";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect(`/s/${code}`);

  const admin = createAdmin();
  const { data: session } = await admin
    .from("sessions")
    .select("id, question")
    .eq("id", code)
    .single();
  if (!session) notFound();

  const { data: participant } = await admin
    .from("participants")
    .select("id, phase")
    .eq("session_id", code)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!participant) redirect(`/s/${code}`);

  if (participant.phase === "complete") redirect(`/s/${code}/themes`);
  if (user.phone) redirect(`/s/${code}/themes`);

  return <VerifyClient sessionCode={code} question={session.question} />;
}
