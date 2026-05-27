/**
 * Wipe all session/response data and non-admin users so we can go live
 * with a clean database. Admins (public.users.role = 'admin') and their
 * matching auth.users rows are preserved. client_events is left alone.
 *
 * Cascades (verified against the live schema):
 *   sessions      → participants, themes, llm_call_logs (via session_id)
 *   participants  → transcript_turns, extracted_points, llm_call_logs
 *   extracted_points → theme_assignments
 *   themes        → theme_assignments
 *
 * So deleting every session is enough to clear all conversation data
 * (including llm_call_logs — accepted as collateral; the user OK'd this).
 *
 * Run:
 *
 *   npx tsx --env-file=.env.local scripts/reset-for-launch.ts          # dry-run
 *   npx tsx --env-file=.env.local scripts/reset-for-launch.ts --execute --yes
 *
 * Without --execute, prints counts and exits without touching anything.
 * --yes skips the interactive confirmation when --execute is set.
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

type Args = {
  execute: boolean;
  yes: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { execute: false, yes: false };
  for (const a of argv) {
    if (a === "--execute") args.execute = true;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    }
  }
  return args;
}

function printUsage() {
  console.error(
    "Usage: npx tsx --env-file=.env.local scripts/reset-for-launch.ts \\",
  );
  console.error("         [--execute] [--yes]");
  console.error("");
  console.error("Default is dry-run: prints counts and exits.");
  console.error("Pass --execute to perform the wipe.");
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

  // Identify admins to preserve.
  const { data: adminRows, error: adminErr } = await admin
    .from("users")
    .select("id, full_name, role")
    .eq("role", "admin");
  if (adminErr) {
    console.error("Failed to list admins:", adminErr.message);
    process.exit(1);
  }
  const adminIds = (adminRows ?? []).map((r) => r.id);
  if (adminIds.length === 0) {
    console.error("Refusing to run: no admin users found. Aborting.");
    process.exit(1);
  }

  // Pre-counts.
  const [
    sessions,
    participants,
    turns,
    points,
    themes,
    themeAssignments,
    llmLogs,
    publicUsers,
    publicUsersNonAdmin,
    clientEvents,
  ] = await Promise.all([
    admin.from("sessions").select("*", { count: "exact", head: true }),
    admin.from("participants").select("*", { count: "exact", head: true }),
    admin.from("transcript_turns").select("*", { count: "exact", head: true }),
    admin.from("extracted_points").select("*", { count: "exact", head: true }),
    admin.from("themes").select("*", { count: "exact", head: true }),
    admin.from("theme_assignments").select("*", { count: "exact", head: true }),
    admin.from("llm_call_logs").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }),
    admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .not("id", "in", `(${adminIds.map((id) => `"${id}"`).join(",")})`),
    admin.from("client_events").select("*", { count: "exact", head: true }),
  ]);

  // auth.users count via admin API.
  const { data: authPage, error: authErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (authErr) {
    console.error("Failed to list auth users:", authErr.message);
    process.exit(1);
  }
  // The SDK doesn't return a total in v2 — fall back to public.users count
  // as a proxy and note the difference explicitly.
  const authProbe = authPage?.users.length ?? 0;

  console.log("\nReset-for-launch plan");
  console.log("─────────────────────");
  console.log(`Mode: ${args.execute ? "EXECUTE" : "DRY-RUN"}`);
  console.log("");
  console.log("Admins to preserve:");
  for (const row of adminRows ?? []) {
    console.log(`  ${row.id}  ${row.full_name ?? "(no name)"}`);
  }
  console.log("");
  console.log("Will delete (cascades noted):");
  console.log(`  sessions             ${sessions.count ?? 0}`);
  console.log(`    ↳ participants     ${participants.count ?? 0}  (cascade)`);
  console.log(`    ↳ transcript_turns ${turns.count ?? 0}  (cascade via participants)`);
  console.log(`    ↳ extracted_points ${points.count ?? 0}  (cascade via participants)`);
  console.log(`    ↳ themes           ${themes.count ?? 0}  (cascade)`);
  console.log(`    ↳ theme_assignments ${themeAssignments.count ?? 0} (cascade via points/themes)`);
  console.log(`    ↳ llm_call_logs    ${llmLogs.count ?? 0}  (cascade — accepted)`);
  console.log("");
  console.log(`  public.users (non-admin)  ${publicUsersNonAdmin.count ?? 0} of ${publicUsers.count ?? 0}`);
  console.log(`  auth.users (non-admin)    ~${(publicUsersNonAdmin.count ?? 0)} (paged delete)`);
  console.log("");
  console.log("Will keep:");
  console.log(`  client_events            ${clientEvents.count ?? 0}  (untouched)`);
  console.log(`  public.users (admin)     ${adminIds.length}`);
  console.log(`  auth.users (admin)       ${adminIds.length}`);
  console.log("");
  console.log(`(auth probe: listUsers returned ${authProbe} on first page)`);

  if (!args.execute) {
    console.log("\nDry-run complete. Re-run with --execute to perform the wipe.");
    return;
  }

  if (!args.yes && !(await confirm("\nThis is irreversible. Proceed?"))) {
    console.log("Aborted.");
    return;
  }

  console.log("\nApplying:");
  let failed = 0;

  // 1. Delete all sessions. Cascades handle participants, transcript_turns,
  //    extracted_points, themes, theme_assignments, llm_call_logs.
  //    .neq on a never-null column is the canonical "delete all" with PostgREST.
  {
    const { error } = await admin
      .from("sessions")
      .delete()
      .not("id", "is", null);
    if (error) {
      failed += 1;
      console.log(`  ✗ sessions: ${error.message}`);
    } else {
      console.log(`  ✓ sessions (cascades applied)`);
    }
  }

  // 2. Delete non-admin public.users rows. Done before auth.users so we
  //    don't leave orphan public rows if auth deletes succeed.
  {
    const { error } = await admin
      .from("users")
      .delete()
      .not("id", "in", `(${adminIds.map((id) => `"${id}"`).join(",")})`);
    if (error) {
      failed += 1;
      console.log(`  ✗ public.users: ${error.message}`);
    } else {
      console.log(`  ✓ public.users (non-admin)`);
    }
  }

  // 3. Delete non-admin auth.users. listUsers is paged; gather all ids
  //    first, then delete one at a time (no bulk endpoint).
  const adminSet = new Set(adminIds);
  const authIdsToDelete: string[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      failed += 1;
      console.log(`  ✗ auth.users list (page ${page}): ${error.message}`);
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      if (!adminSet.has(u.id)) authIdsToDelete.push(u.id);
    }
    if (users.length < 1000) break;
    page += 1;
  }

  let authDeleted = 0;
  let authFailed = 0;
  for (const id of authIdsToDelete) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      authFailed += 1;
      console.log(`  ✗ auth.users[${id}]: ${error.message}`);
    } else {
      authDeleted += 1;
    }
  }
  if (authFailed > 0) failed += 1;
  console.log(`  ✓ auth.users: deleted ${authDeleted}, failed ${authFailed}`);

  // Verify post-state.
  const post = await Promise.all([
    admin.from("sessions").select("*", { count: "exact", head: true }),
    admin.from("participants").select("*", { count: "exact", head: true }),
    admin.from("transcript_turns").select("*", { count: "exact", head: true }),
    admin.from("extracted_points").select("*", { count: "exact", head: true }),
    admin.from("themes").select("*", { count: "exact", head: true }),
    admin.from("theme_assignments").select("*", { count: "exact", head: true }),
    admin.from("llm_call_logs").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("client_events").select("*", { count: "exact", head: true }),
  ]);
  console.log("\nPost-state:");
  console.log(`  sessions          ${post[0].count ?? 0}`);
  console.log(`  participants      ${post[1].count ?? 0}`);
  console.log(`  transcript_turns  ${post[2].count ?? 0}`);
  console.log(`  extracted_points  ${post[3].count ?? 0}`);
  console.log(`  themes            ${post[4].count ?? 0}`);
  console.log(`  theme_assignments ${post[5].count ?? 0}`);
  console.log(`  llm_call_logs     ${post[6].count ?? 0}`);
  console.log(`  public.users      ${post[7].count ?? 0}  (admins remaining)`);
  console.log(`  client_events     ${post[8].count ?? 0}  (untouched)`);

  if (failed > 0) {
    console.error(`\n${failed} step(s) had failures — see above.`);
    process.exit(1);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
