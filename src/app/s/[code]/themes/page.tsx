import { notFound, redirect } from "next/navigation";

import ThemesClient from "./themes-client";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect(`/s/${code}`);
  if (!user.phone) redirect(`/s/${code}/verify`);

  const admin = createAdmin();
  const { data: session } = await admin
    .from("sessions")
    .select("id, question")
    .eq("id", code)
    .single();
  if (!session) notFound();

  const { data: participant } = await admin
    .from("participants")
    .select("id")
    .eq("session_id", code)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!participant) redirect(`/s/${code}`);

  const { data: themes } = await admin
    .from("themes")
    .select("id, short_name, description, created_at")
    .eq("session_id", code)
    .order("created_at", { ascending: true });

  const { data: assignments } = await admin
    .from("theme_assignments")
    .select("theme_id, point_id, themes!inner(session_id)")
    .eq("themes.session_id", code);

  const counts: Record<string, number> = {};
  for (const a of assignments ?? []) counts[a.theme_id] = (counts[a.theme_id] ?? 0) + 1;

  return (
    <ThemesClient
      sessionCode={code}
      question={session.question}
      initialThemes={(themes ?? []).map((t) => ({
        id: t.id,
        short_name: t.short_name,
        description: t.description,
        count: counts[t.id] ?? 0,
      }))}
    />
  );
}
