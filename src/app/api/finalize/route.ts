import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { analyzeParticipant } from "@/lib/analyze";
import { createClient as createServer } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

export const maxDuration = 120;

// Run (or re-run) the fused analysis pass for the calling user's participant
// in this session. Idempotent across re-fires: every call wipes the
// participant's prior extracted_points + assignments and reinserts based on
// the current transcript. Theme rewrites broaden cumulatively across runs.
//
// The endpoint name (`finalize`) predates the redesign — there's no longer
// a terminal phase, just a "share what you've got so far" trigger that the
// chat client fires every time the facilitator emits [READY_TO_SHARE].
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
    .select("id")
    .eq("session_id", sessionCode)
    .eq("user_id", user.id)
    .single();
  if (!participant) return new Response("participant not found", { status: 404 });

  const result = await analyzeParticipant(participant.id);

  // Only bust the cache when something actually changed. A skipped call
  // (reload re-fire) means the room state is exactly what the client
  // already has — invalidating the path would force an unnecessary
  // re-fetch.
  if (!result.skipped) {
    revalidatePath(`/s/${sessionCode}`);
  }

  return NextResponse.json({ ok: true, ...result });
}
