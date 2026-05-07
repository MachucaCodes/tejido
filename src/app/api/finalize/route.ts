import { NextResponse } from "next/server";

import { clusterParticipantPoints } from "@/lib/cluster";
import { extractPointsForParticipant } from "@/lib/extract";
import { createClient as createServer } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { sessionCode } = (await req.json()) as { sessionCode?: string };
  if (!sessionCode) return new Response("missing sessionCode", { status: 400 });

  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return new Response("not authenticated", { status: 401 });

  const admin = createAdmin();
  const { data: participant } = await admin
    .from("participants")
    .select("id, phase")
    .eq("session_id", sessionCode)
    .eq("user_id", user.id)
    .single();
  if (!participant) return new Response("participant not found", { status: 404 });

  if (participant.phase !== "complete") {
    await extractPointsForParticipant(participant.id);
    await clusterParticipantPoints(participant.id);
    await admin
      .from("participants")
      .update({ phase: "complete", completed_at: new Date().toISOString() })
      .eq("id", participant.id);
  }

  return NextResponse.json({ ok: true });
}
