import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

// Soft-reset the calling admin's own participant in this session — clears
// their conversation, extracted points (cascades theme_assignments), and
// LLM call logs. Preserves the participant row, the session, themes
// other participants contribute to, and the session-level summary
// (intentionally; summaries are stale-checked and will rewrite on the
// next [READY_TO_SHARE] from anyone in the room). Mirrors
// scripts/reset-participant.ts; the script remains the source of truth.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
      status: guard.reason === "unauth" ? 401 : 403,
    });
  }

  const { code } = await params;
  const admin = createAdmin();

  const { data: participant, error: pErr } = await admin
    .from("participants")
    .select("id")
    .eq("session_id", code)
    .eq("user_id", guard.user.id)
    .maybeSingle();
  if (pErr) return new Response(pErr.message, { status: 400 });
  if (!participant) return new Response("no participant to reset", { status: 404 });

  // Delete extracted_points first so theme_assignments cascade happens
  // before anything else touches participant rows. Also clear the analysis
  // anchor — fresh transcript_turns will start at ord=0, and leaving a
  // stale high anchor would permanently skip the next finalize.
  const steps: Array<[string, () => PromiseLike<{ error: { message: string } | null }>]> = [
    ["extracted_points", () => admin.from("extracted_points").delete().eq("participant_id", participant.id)],
    ["transcript_turns", () => admin.from("transcript_turns").delete().eq("participant_id", participant.id)],
    ["llm_call_logs", () => admin.from("llm_call_logs").delete().eq("participant_id", participant.id)],
    ["analysis_anchor", () => admin.from("participants").update({ last_analyzed_turn_ord: null }).eq("id", participant.id)],
  ];
  for (const [label, run] of steps) {
    const { error } = await run();
    if (error) {
      return new Response(`${label}: ${error.message}`, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, participant_id: participant.id });
}
