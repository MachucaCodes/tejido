import { runSweep } from "@/lib/sweep";
import { createAdmin } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Called every 30 minutes by pg_cron in Supabase (job "tejido-sweep"). The
// shared secret lives in the app_secrets table, which both sides read, so
// there's no env var to keep in sync.
export async function POST(req: Request) {
  const started = Date.now();
  const { data: secret } = await createAdmin()
    .from("app_secrets")
    .select("value")
    .eq("name", "cron_secret")
    .single();
  const auth = req.headers.get("authorization");
  if (!secret?.value || auth !== `Bearer ${secret.value}`) {
    return new Response("unauthorized", { status: 401 });
  }

  // Leave room for the summary rebuilds after the analyses.
  const result = await runSweep(started + 150_000);
  return Response.json(result);
}
