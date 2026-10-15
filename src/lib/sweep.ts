import { revalidatePath } from "next/cache";

import { analyzeParticipant } from "@/lib/analyze";
import { regenerateSummaryIfStale } from "@/lib/summary";
import { createAdmin } from "@/lib/supabase/admin";

// A conversation counts as done-for-now once it's been quiet this long.
const IDLE = "30 minutes";

// The sweep went live here. Conversations that ended before it keep the
// results they had, so old sessions don't shift under people.
const SWEEP_SINCE = "2026-10-15T00:00:00Z";

/**
 * Backstop run by the Supabase cron every 30 minutes:
 * 1. Analyze conversations that moved past their last analysis and went
 *    quiet — people the facilitator never marked ready, or who came back
 *    and said more.
 * 2. Rebuild any session summary whose room grew 10% since the last one.
 *
 * Stops starting new analyses at `deadline`; the next run picks up the rest.
 */
export async function runSweep(deadline: number) {
  const admin = createAdmin();

  const { data, error } = await admin.rpc("participants_needing_analysis", {
    idle: IDLE,
    since: SWEEP_SINCE,
  });
  if (error) throw new Error(`sweep query failed: ${error.message}`);
  const pending = (data ?? []) as {
    participant_id: string;
    session_id: string;
  }[];

  const analyzed: string[] = [];
  const failed: string[] = [];
  for (const row of pending) {
    if (Date.now() > deadline) break;
    try {
      const result = await analyzeParticipant(row.participant_id);
      if (!result.skipped) analyzed.push(row.participant_id);
    } catch (err) {
      // analyzeParticipant logs the failed call; the query skips it next run.
      console.error(`[sweep] analysis failed for ${row.participant_id}:`, err);
      failed.push(row.participant_id);
    }
  }

  // Check every session with points since the sweep went live, not just the
  // ones touched above — a rebuild that lost the lock race earlier gets
  // retried here. Older sessions keep the summary they ended with.
  const { data: recent } = await admin
    .from("extracted_points")
    .select("participants!inner(session_id, sessions!inner(archived_at))")
    .gte("created_at", SWEEP_SINCE)
    .is("participants.sessions.archived_at", null)
    .overrideTypes<
      { participants: { session_id: string } }[],
      { merge: false }
    >();
  const sessionIds = new Set(
    (recent ?? []).map((r) => r.participants.session_id),
  );
  const summaries: { session: string; reason: string }[] = [];
  for (const id of sessionIds) {
    try {
      const r = await regenerateSummaryIfStale(id);
      if (r.regenerated) summaries.push({ session: id, reason: r.reason });
    } catch (err) {
      console.error(`[sweep] summary failed for ${id}:`, err);
    }
  }

  const touched = new Set([
    ...pending
      .filter((r) => analyzed.includes(r.participant_id))
      .map((r) => r.session_id),
    ...summaries.map((s) => s.session),
  ]);
  for (const id of touched) revalidatePath(`/s/${id}`);

  return {
    pending: pending.length,
    analyzed: analyzed.length,
    failed: failed.length,
    summaries,
  };
}
