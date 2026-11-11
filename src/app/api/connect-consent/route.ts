import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

type Body = { sessionCode?: string; consent?: boolean };

/**
 * Opt in to (or back out of) being connected with neighbors in a "connect"
 * session. Consent is per participant, per session — never global — and we
 * keep the exact wording the person agreed to, in the language they saw it.
 *
 * Only a phone-keyed account can opt in: an anonymous session has no name or
 * number to connect anyone with.
 */
export async function POST(req: Request) {
  const { sessionCode, consent } = (await req.json().catch(() => ({}))) as Body;
  if (!sessionCode || typeof consent !== "boolean") {
    return new Response("missing sessionCode or consent", { status: 400 });
  }

  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user || user.is_anonymous) {
    return new Response("sign in with your phone first", { status: 401 });
  }

  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("privacy")
    .eq("id", sessionCode)
    .maybeSingle();
  if (!session) return new Response("session not found", { status: 404 });
  // Backing out always works; opting in only where the session asked for it.
  if (consent && session.privacy !== "connect") {
    return new Response("this session is anonymous", { status: 400 });
  }

  let consentText: string | null = null;
  if (consent) {
    const t = await getTranslations("connect");
    consentText = `${t("consentLabel")} — ${t("consentBody")}`;
  }

  const { data: updated, error } = await admin
    .from("participants")
    .update({
      connect_consent_at: consent ? new Date().toISOString() : null,
      connect_consent_text: consentText,
    })
    .eq("session_id", sessionCode)
    .eq("user_id", user.id)
    .select("id");
  if (error) return new Response(error.message, { status: 500 });
  if (!updated?.length) {
    return new Response("you haven't joined this session", { status: 404 });
  }

  return NextResponse.json({ ok: true, consent });
}
