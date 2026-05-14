/**
 * Soft-reset a participant's session — clears their conversation,
 * extracted points (and the theme_assignments cascade), and LLM call
 * logs. Preserves the participant row, the auth user, and the session-
 * level theme rows that other participants contribute to.
 *
 * Run with:
 *
 *   npx tsx --env-file=.env.local scripts/reset-participant.ts \
 *     --participant <uuid> [--clear-events] [--yes]
 *
 * Without --yes the script prints what it will do and asks for
 * confirmation. With --clear-events it also deletes client_events rows
 * for the participant's current user_id (useful for log hygiene; the
 * default keeps them so observability stays intact).
 *
 * History note: an earlier ad-hoc reset cleared transcript_turns +
 * llm_call_logs but missed extracted_points, which then caused the
 * page to seed `hasAnalyzed=true` on refresh from stale rows. Always
 * clear extracted_points or the participant gets resurrected
 * mid-flight on next visit.
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

type Args = {
  participantId: string;
  clearEvents: boolean;
  yes: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { participantId: "", clearEvents: false, yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--participant" || a === "-p") {
      args.participantId = argv[++i] ?? "";
    } else if (a === "--clear-events") {
      args.clearEvents = true;
    } else if (a === "--yes" || a === "-y") {
      args.yes = true;
    } else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    }
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.participantId)) {
    printUsage();
    console.error("\nMissing or invalid --participant <uuid>");
    process.exit(2);
  }
  return args;
}

function printUsage() {
  console.error(
    "Usage: npx tsx --env-file=.env.local scripts/reset-participant.ts \\",
  );
  console.error("         --participant <uuid> [--clear-events] [--yes]");
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${prompt} [y/N]: `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set " +
        "(use --env-file=.env.local with tsx).",
    );
    process.exit(2);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pre-flight: confirm the participant exists and grab the user_id we'd
  // use for an optional client_events sweep.
  const { data: participant, error: pErr } = await admin
    .from("participants")
    .select("id, user_id, session_id, phase")
    .eq("id", args.participantId)
    .maybeSingle();
  if (pErr) {
    console.error("Participant lookup failed:", pErr.message);
    process.exit(1);
  }
  if (!participant) {
    console.error(`No participant found with id=${args.participantId}`);
    process.exit(1);
  }

  // Pre-counts so the user knows what's about to be deleted.
  const counts = await Promise.all([
    admin.from("transcript_turns").select("*", { count: "exact", head: true }).eq("participant_id", args.participantId),
    admin.from("extracted_points").select("*", { count: "exact", head: true }).eq("participant_id", args.participantId),
    admin.from("llm_call_logs").select("*", { count: "exact", head: true }).eq("participant_id", args.participantId),
    args.clearEvents
      ? admin.from("client_events").select("*", { count: "exact", head: true }).eq("user_id", participant.user_id)
      : Promise.resolve({ count: null }),
  ]);
  const [turns, points, logs, events] = counts.map((r) => r.count ?? 0);

  console.log("\nReset plan");
  console.log("──────────");
  console.log(`  participant_id   ${participant.id}`);
  console.log(`  user_id          ${participant.user_id}`);
  console.log(`  session_id       ${participant.session_id}`);
  console.log(`  phase            ${participant.phase}`);
  console.log("\nWill delete:");
  console.log(`  transcript_turns      ${turns}`);
  console.log(`  extracted_points      ${points}  (cascades theme_assignments)`);
  console.log(`  llm_call_logs         ${logs}`);
  if (args.clearEvents) {
    console.log(`  client_events         ${events}  (--clear-events)`);
  } else {
    console.log("  client_events         (kept — pass --clear-events to also wipe)");
  }
  console.log("\nKeeps: participant row, auth user, session rows, themes.\n");

  if (turns === 0 && points === 0 && logs === 0 && events === 0) {
    console.log("Nothing to delete. Exiting.");
    return;
  }

  if (!args.yes && !(await confirm("Proceed?"))) {
    console.log("Aborted.");
    return;
  }

  // Delete order: extracted_points first so theme_assignments cascade
  // happens before we touch anything else, then turns, then logs, then
  // (optional) events. Each deletion is independent — failures in later
  // steps don't undo earlier ones, but the script reports per-step.
  const steps: Array<[string, () => Promise<{ error: unknown }>]> = [
    ["extracted_points", async () => {
      const { error } = await admin.from("extracted_points").delete().eq("participant_id", args.participantId);
      return { error };
    }],
    ["transcript_turns", async () => {
      const { error } = await admin.from("transcript_turns").delete().eq("participant_id", args.participantId);
      return { error };
    }],
    ["llm_call_logs", async () => {
      const { error } = await admin.from("llm_call_logs").delete().eq("participant_id", args.participantId);
      return { error };
    }],
  ];
  if (args.clearEvents) {
    steps.push([
      "client_events",
      async () => {
        const { error } = await admin.from("client_events").delete().eq("user_id", participant.user_id);
        return { error };
      },
    ]);
  }

  console.log("\nApplying:");
  let failed = 0;
  for (const [label, fn] of steps) {
    const { error } = await fn();
    if (error) {
      failed += 1;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ${label.padEnd(20)} ${msg}`);
    } else {
      console.log(`  ✓ ${label}`);
    }
  }

  // Verify post-state.
  const post = await Promise.all([
    admin.from("transcript_turns").select("*", { count: "exact", head: true }).eq("participant_id", args.participantId),
    admin.from("extracted_points").select("*", { count: "exact", head: true }).eq("participant_id", args.participantId),
    admin.from("llm_call_logs").select("*", { count: "exact", head: true }).eq("participant_id", args.participantId),
  ]);
  console.log("\nPost-state:");
  console.log(`  transcript_turns  ${post[0].count ?? 0}`);
  console.log(`  extracted_points  ${post[1].count ?? 0}`);
  console.log(`  llm_call_logs     ${post[2].count ?? 0}`);

  if (failed > 0) {
    console.error(`\n${failed} step(s) failed — see above.`);
    process.exit(1);
  }
  console.log("\nDone. Participant can reload the page to land in a fresh chat.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
