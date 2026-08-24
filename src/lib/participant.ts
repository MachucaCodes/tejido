import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

export type ParticipantRecord = {
  id: string;
  session_id: string;
  user_id: string;
  phase: "in_conversation" | "complete";
};

export type SessionRecord = {
  id: string;
  topic: string;
  topic_es: string | null;
  context: string | null;
  intro_message: string | null;
  intro_message_es: string | null;
  instructions: string | null;
  status: "open" | "closed";
  archived_at: string | null;
  prompt_task_framing: string | null;
  prompt_mechanics: string | null;
  prompt_pacing: string | null;
  prompt_perspectives_instructions: string | null;
};

export async function getCurrentUser() {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  return { user: data.user, supabase };
}

// Used in API routes (POST handlers) where the proxy hasn't already created an anon user.
export async function ensureAnonymousUser() {
  const supabase = await createServer();
  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) return { user: existing.user, supabase };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`anonymous sign-in failed: ${error?.message}`);
  }
  return { user: data.user, supabase };
}

export async function getOrCreateParticipant(
  sessionCode: string,
  userId: string,
): Promise<{ session: SessionRecord; participant: ParticipantRecord }> {
  const admin = createAdmin();

  const { data: session, error: sessionErr } = await admin
    .from("sessions")
    .select(
      "id, topic, topic_es, context, intro_message, intro_message_es, instructions, status, archived_at, prompt_task_framing, prompt_mechanics, prompt_pacing, prompt_perspectives_instructions",
    )
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
