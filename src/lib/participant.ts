import { createClient as createServer } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

export type ParticipantRecord = {
  id: string;
  session_id: string;
  user_id: string;
  phase: "in_conversation" | "awaiting_verification" | "complete";
};

export type SessionRecord = {
  id: string;
  question: string;
  status: "open" | "closed";
};

export async function getCurrentUser() {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  return { user: data.user, supabase };
}

// In API routes (POST/route handlers), it's safe to sign in anonymously here —
// cookies can be written. In Server Components, rely on the proxy to have done it already.
export async function ensureAnonymousUser() {
  const supabase = await createServer();
  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) return { user: existing.user, supabase };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`anonymous sign-in failed: ${error?.message}`);
  return { user: data.user, supabase };
}

export async function getOrCreateParticipant(
  sessionCode: string,
  userId: string,
): Promise<{ session: SessionRecord; participant: ParticipantRecord }> {
  const admin = createAdmin();

  const { data: session, error: sessionErr } = await admin
    .from("sessions")
    .select("id, question, status")
    .eq("id", sessionCode)
    .single();
  if (sessionErr || !session) throw new Error(`session not found: ${sessionCode}`);

  const { data: existing } = await admin
    .from("participants")
    .select("id, session_id, user_id, phase")
    .eq("session_id", sessionCode)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { session, participant: existing as ParticipantRecord };

  const { data: created, error: createErr } = await admin
    .from("participants")
    .insert({ session_id: sessionCode, user_id: userId })
    .select("id, session_id, user_id, phase")
    .single();
  if (createErr || !created) throw new Error(`participant create failed: ${createErr?.message}`);
  return { session, participant: created as ParticipantRecord };
}
