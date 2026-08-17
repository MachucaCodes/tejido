import { createAdmin } from "@/lib/supabase/admin";

// Same shape enforced when a session is created — the code goes straight into
// the join URL (/s/<code>), so keep it slug-safe.
export const CODE_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

type RenameResult = { ok: true } | { ok: false; error: string };

/**
 * Change a session's code (sessions.id).
 *
 * participants / themes / llm_call_logs follow automatically — their FKs are
 * ON UPDATE CASCADE. client_events.session_code is a write-only telemetry
 * column with no FK, so it's carried over by hand afterwards; a failure there
 * is not worth failing the rename over.
 *
 * Existing /s/<old-code> links stop working — there is no redirect from the
 * old code. Callers should say so before renaming.
 */
export async function renameSession(
  oldCode: string,
  newCode: string,
): Promise<RenameResult> {
  if (!CODE_RE.test(newCode)) {
    return {
      ok: false,
      error: "invalid code format — lowercase letters, digits, - and _; max 63 chars",
    };
  }
  if (oldCode === newCode) return { ok: true };

  const admin = createAdmin();

  const { data, error } = await admin
    .from("sessions")
    .update({ id: newCode })
    .eq("id", oldCode)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? `code "${newCode}" is already taken` : error.message,
    };
  }
  if (!data?.length) return { ok: false, error: `no session with code "${oldCode}"` };

  await admin
    .from("client_events")
    .update({ session_code: newCode })
    .eq("session_code", oldCode);

  return { ok: true };
}
