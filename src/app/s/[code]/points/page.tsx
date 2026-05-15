import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

import {
  PointsView,
  type AssignmentRow,
  type PointRow,
  type ThemeRow,
  type TurnRow,
} from "./points-view";

export default async function SessionPointsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const admin = createAdmin();
  const guard = await requireAdmin();
  const isAdmin = guard.ok;

  const { data: session } = await admin
    .from("sessions")
    .select("id, topic")
    .eq("id", code)
    .single();
  if (!session) notFound();

  const [pointsRes, themesRes, assignmentsRes, turnsRes] = await Promise.all([
    admin
      .from("extracted_points")
      .select(
        "id, participant_id, idx, surface_phrase, want, context, rationale, doubts, created_at, participants!inner(session_id)",
      )
      .eq("participants.session_id", code)
      .order("created_at", { ascending: true })
      .order("idx", { ascending: true }),
    admin
      .from("themes")
      .select("id, short_name")
      .eq("session_id", code)
      .order("created_at", { ascending: true }),
    admin
      .from("theme_assignments")
      .select("point_id, theme_id, themes!inner(session_id)")
      .eq("themes.session_id", code),
    isAdmin
      ? admin
          .from("transcript_turns")
          .select(
            "id, participant_id, role, content, ord, participants!inner(session_id)",
          )
          .eq("participants.session_id", code)
          .order("ord", { ascending: true })
      : Promise.resolve({ data: [] as TurnRow[] }),
  ]);

  const points = (pointsRes.data ?? []) as PointRow[];
  const themes = (themesRes.data ?? []) as ThemeRow[];
  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
  const turns = (turnsRes.data ?? []) as TurnRow[];

  const voices: string[] = [];
  const seen = new Set<string>();
  for (const p of points) {
    if (seen.has(p.participant_id)) continue;
    seen.add(p.participant_id);
    voices.push(p.participant_id);
  }

  return (
    <PointsView
      code={code}
      topic={session.topic ?? null}
      points={points}
      voices={voices}
      themes={themes}
      assignments={assignments}
      turns={turns}
      isAdmin={isAdmin}
    />
  );
}
