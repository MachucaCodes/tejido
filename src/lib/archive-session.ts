import { createAdmin } from "@/lib/supabase/admin";

type ArchiveResult = { ok: true; archived_at: string | null } | { ok: false; error: string };

/**
 * Archive or un-archive a session.
 *
 * Archiving is the retirement path — it is deliberately NOT a delete. The
 * session row, its participants, transcripts, points and themes all stay
 * exactly where they are; the only change is that the session stops appearing
 * in front-end listings and stops accepting new input. Respondent data is the
 * asset here, so nothing about this path removes any of it.
 *
 * `archived_at` null is the active state, so un-archiving is just clearing it —
 * no separate flag to keep in sync, and no backfill for existing rows.
 *
 * Hard-deleting a session that has respondents is blocked at the database level
 * (participants.session_id is ON DELETE RESTRICT), so this is the only way to
 * take a session out of circulation.
 */
export async function setSessionArchived(
  code: string,
  archived: boolean,
): Promise<ArchiveResult> {
  const admin = createAdmin();
  const archived_at = archived ? new Date().toISOString() : null;

  const { data, error } = await admin
    .from("sessions")
    .update({ archived_at })
    .eq("id", code)
    .select("archived_at");

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: `no session with code "${code}"` };

  return { ok: true, archived_at };
}
