import { isLocale, type Locale } from "@/i18n/locales";
import { analyzeParticipant } from "@/lib/analyze";
import { startFacilitatorTurn } from "@/lib/facilitator-turn";
import { getOrCreateParticipant } from "@/lib/participant";
import { READY_TOKEN } from "@/lib/prompts/facilitator";
import { createAdmin } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/transcribe";
import { localized } from "@/lib/translate-session";
import { downloadMedia, sendWhatsAppText } from "@/lib/whatsapp";

// People often send a thought as several short messages. Wait this long after
// a message before answering, and answer everything that arrived as one turn.
const SETTLE_MS = 3000;
const LOCK_MS = 120_000;

const COPY = {
  en: {
    start: (topic: string) => `Great, let's start. The topic is: "${topic}". What's on your mind?`,
    declined: "No problem. If you change your mind, just reply here.",
    noConversation: "You don't have an open Tejido conversation right now.",
    results: (link: string) =>
      `Thanks for sharing! See what everyone is saying so far: ${link}\n\nYou'll sign in with this phone number. You can keep chatting here too.`,
    lostThread: "Sorry — I lost the thread there. Could you try saying that again?",
    voiceFailed: "Sorry, I couldn't hear that voice note. Could you try again, or type it?",
    error: "Sorry, something went wrong on our side. Please try again in a minute.",
  },
  es: {
    start: (topic: string) => `¡Genial, empecemos! El tema es: "${topic}". ¿Qué piensas?`,
    declined: "No hay problema. Si cambias de opinión, solo responde aquí.",
    noConversation: "No tienes una conversación de Tejido abierta en este momento.",
    results: (link: string) =>
      `¡Gracias por compartir! Mira lo que todos están diciendo hasta ahora: ${link}\n\nVas a iniciar sesión con este número de teléfono. También puedes seguir conversando aquí.`,
    lostThread: "Perdón, perdí el hilo. ¿Puedes decirlo otra vez?",
    voiceFailed: "Perdón, no pude escuchar esa nota de voz. ¿Puedes intentarlo otra vez o escribirlo?",
    error: "Perdón, algo falló de nuestro lado. Inténtalo otra vez en un minuto.",
  },
} as const;

const YES_RE = /^\s*(yes|y|yeah|yep|ok|okay|sure|start|yes,? start|s[ií]|s[ií],? empezar|dale|claro|empezar|empecemos)\s*[.!]*\s*$/i;
const NO_RE = /^\s*(no|nope|not now|no thanks|ahora no|no gracias)\s*[.!]*\s*$/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Contact's language, else Spanish for Costa Rica numbers, else English. */
export function contactLanguage(contact: { phone: string; language: string | null }): Locale {
  if (isLocale(contact.language)) return contact.language;
  return contact.phone.startsWith("+506") ? "es" : "en";
}

/**
 * Find or create the phone-keyed auth user — the same account phone OTP sign-in
 * lands on, so the web results page shows this conversation.
 */
async function ensurePhoneUser(phone: string, language: Locale): Promise<string> {
  const admin = createAdmin();
  const lookup = async () => {
    const { data } = await admin.rpc("auth_user_id_by_phone", { p_phone: phone });
    return (data as string | null) ?? null;
  };
  let userId = await lookup();
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ phone, phone_confirm: true });
    userId = data.user?.id ?? (await lookup());
    if (!userId) throw new Error(`could not create user for ${phone}: ${error?.message}`);
  }
  await admin
    .from("users")
    .update({ preferred_language: language })
    .eq("id", userId)
    .is("preferred_language", null);
  return userId;
}

type InviteRow = {
  id: string;
  session_id: string;
  contact_id: string;
  status: string;
  participant_id: string | null;
  results_link_sent_at: string | null;
  sessions: { status: string; archived_at: string | null } | null;
};

const INVITE_SELECT =
  "id, session_id, contact_id, status, participant_id, results_link_sent_at, sessions(status, archived_at)";

async function findInvite(contactId: string, buttonPayload: string | null): Promise<InviteRow | null> {
  const admin = createAdmin();
  const tapped = buttonPayload?.match(/^invite:([0-9a-f-]{36}):/)?.[1];
  if (tapped) {
    const { data } = await admin
      .from("session_invites")
      .select(INVITE_SELECT)
      .eq("id", tapped)
      .eq("contact_id", contactId)
      .maybeSingle()
      .overrideTypes<InviteRow, { merge: false }>();
    if (data) return data;
  }
  // Otherwise the most recent invite for a session that's still running.
  const { data } = await admin
    .from("session_invites")
    .select(INVITE_SELECT)
    .eq("contact_id", contactId)
    .in("status", ["sent", "accepted", "declined"])
    .order("sent_at", { ascending: false })
    .limit(10)
    .overrideTypes<InviteRow[], { merge: false }>();
  return (data ?? []).find((i) => i.sessions?.status === "open" && !i.sessions.archived_at) ?? null;
}

async function acquireLock(inviteId: string): Promise<boolean> {
  const admin = createAdmin();
  const deadline = Date.now() + LOCK_MS;
  while (Date.now() < deadline) {
    const now = new Date();
    const { data } = await admin
      .from("session_invites")
      .update({ turn_lock_until: new Date(now.getTime() + LOCK_MS).toISOString() })
      .eq("id", inviteId)
      .or(`turn_lock_until.is.null,turn_lock_until.lt.${now.toISOString()}`)
      .select("id");
    if (data?.length) return true;
    await sleep(1500);
  }
  return false;
}

async function releaseLock(inviteId: string) {
  await createAdmin().from("session_invites").update({ turn_lock_until: null }).eq("id", inviteId);
}

/**
 * Handle an inbound WhatsApp message (runs after the webhook has answered).
 * Waits for the person to finish typing, then answers everything unprocessed
 * from that phone as one turn.
 */
export async function handleInbound(messageId: string, phone: string, origin: string) {
  await sleep(SETTLE_MS);
  const admin = createAdmin();

  // A newer message from the same phone will do the answering.
  const { data: self } = await admin
    .from("whatsapp_messages")
    .select("created_at")
    .eq("id", messageId)
    .single();
  if (!self) return;
  const { count: newer } = await admin
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("direction", "in")
    .is("processed_at", null)
    .gt("created_at", self.created_at);
  if (newer) return;

  const { data: contact } = await admin
    .from("contacts")
    .select("id, phone, language, user_id")
    .eq("phone", phone)
    .maybeSingle();
  if (!contact) {
    // Not someone we invited (e.g. a reply to a Clock notification on the
    // shared number). Mark it handled and stay quiet.
    await admin.from("whatsapp_messages").update({ processed_at: new Date().toISOString() }).eq("id", messageId);
    return;
  }
  const lang = contactLanguage(contact);
  const copy = COPY[lang];

  const { data: pendingRaw } = await admin
    .from("whatsapp_messages")
    .select("id, raw")
    .eq("phone", phone)
    .eq("direction", "in")
    .is("processed_at", null)
    .order("created_at", { ascending: true });
  const lastPayload = (pendingRaw ?? [])
    .map((m) => (m.raw as { _parsed?: { buttonPayload?: string } } | null)?._parsed?.buttonPayload)
    .filter(Boolean)
    .pop() ?? null;

  const invite = await findInvite(contact.id, lastPayload);
  if (!invite) {
    await admin.from("whatsapp_messages").update({ processed_at: new Date().toISOString() }).eq("phone", phone).eq("direction", "in").is("processed_at", null);
    await sendWhatsAppText(phone, copy.noConversation);
    return;
  }

  if (!(await acquireLock(invite.id))) return;
  let share: { participantId: string } | null = null;
  try {
    // Claim everything unprocessed now that we hold the lock.
    const { data: batch } = await admin
      .from("whatsapp_messages")
      .update({ processed_at: new Date().toISOString(), invite_id: invite.id })
      .eq("phone", phone)
      .eq("direction", "in")
      .is("processed_at", null)
      .select("id, body, media_url, raw, created_at");
    if (!batch?.length) return;
    batch.sort((a, b) => a.created_at.localeCompare(b.created_at));

    const pieces: string[] = [];
    let via: "text" | "voice" = "text";
    for (const m of batch) {
      if (m.body?.trim()) pieces.push(m.body.trim());
      else if (m.media_url) {
        try {
          const audio = await downloadMedia(m.media_url);
          const text = (await transcribeAudio(audio, "voice.ogg", lang)).trim();
          if (text) {
            pieces.push(text);
            via = "voice";
          }
        } catch (err) {
          console.error("[whatsapp] transcription failed", err);
        }
      }
    }
    const userText = pieces.join("\n");
    const tappedNo = batch.some((m) => /:no$/.test((m.raw as { _parsed?: { buttonPayload?: string } } | null)?._parsed?.buttonPayload ?? ""));

    if (!userText && !tappedNo) {
      await sendWhatsAppText(phone, copy.voiceFailed, invite.id);
      return;
    }

    let participantId = invite.participant_id;
    // "declined" can still change their mind by replying later.
    if (invite.status !== "accepted") {
      if (tappedNo || NO_RE.test(userText)) {
        await admin
          .from("session_invites")
          .update({ status: "declined", replied_at: new Date().toISOString() })
          .eq("id", invite.id);
        await sendWhatsAppText(phone, copy.declined, invite.id);
        return;
      }

      const userId = await ensurePhoneUser(phone, lang);
      if (contact.user_id !== userId) {
        await admin.from("contacts").update({ user_id: userId }).eq("id", contact.id);
      }
      const { session, participant } = await getOrCreateParticipant(invite.session_id, userId);
      participantId = participant.id;
      await admin
        .from("session_invites")
        .update({ status: "accepted", replied_at: new Date().toISOString(), participant_id: participant.id })
        .eq("id", invite.id);

      // Same opener the web chat shows. It isn't stored as a turn there
      // either, so the facilitator sees identical history on both.
      const opener =
        localized(session.intro_message, session.intro_message_es, lang) ??
        copy.start(localized(session.topic, session.topic_es, lang) ?? session.topic);
      // A bare "yes" just starts. Anything more is already their first answer.
      if (YES_RE.test(userText) || !userText) {
        await sendWhatsAppText(phone, opener, invite.id);
        return;
      }
      await sendWhatsAppText(phone, opener, invite.id);
    }

    if (!participantId) return;
    const { ready } = await runTurn({ invite, participantId, phone, userText, via, lang });
    if (ready) share = { participantId };
  } catch (err) {
    console.error("[whatsapp] handleInbound failed", err);
    await sendWhatsAppText(phone, copy.error, invite.id).catch(() => {});
  } finally {
    await releaseLock(invite.id);
  }

  // Analysis is slow; run it outside the lock so the next message isn't held up.
  if (share) await shareResults(invite, share.participantId, phone, lang, origin);
}

/**
 * Same share step the web client fires on [READY_TO_SHARE]: re-run analysis,
 * then send the results link the first time only.
 */
async function shareResults(
  invite: InviteRow,
  participantId: string,
  phone: string,
  lang: Locale,
  origin: string,
) {
  try {
    await analyzeParticipant(participantId);
  } catch (err) {
    console.error("[whatsapp] analysis failed", err);
    return;
  }
  if (invite.results_link_sent_at) return;
  const link = `${origin}/s/${encodeURIComponent(invite.session_id)}?via=whatsapp`;
  const sent = await sendWhatsAppText(phone, COPY[lang].results(link), invite.id);
  if (sent.ok) {
    await createAdmin()
      .from("session_invites")
      .update({ results_link_sent_at: new Date().toISOString() })
      .eq("id", invite.id);
  }
}

async function runTurn({
  invite,
  participantId,
  phone,
  userText,
  via,
  lang,
}: {
  invite: InviteRow;
  participantId: string;
  phone: string;
  userText: string;
  via: "text" | "voice";
  lang: Locale;
}): Promise<{ ready: boolean }> {
  const admin = createAdmin();
  const copy = COPY[lang];
  const { data: p } = await admin
    .from("participants")
    .select("user_id")
    .eq("id", participantId)
    .single();
  if (!p) return { ready: false };
  const { session, participant } = await getOrCreateParticipant(invite.session_id, p.user_id);
  if (session.status !== "open" || session.archived_at) {
    await sendWhatsAppText(phone, copy.noConversation, invite.id);
    return { ready: false };
  }

  const turn = await startFacilitatorTurn({ session, participant, userText, via });
  let result: { text: string; refusal: boolean };
  try {
    result = await turn.finish();
  } catch (err) {
    await turn.fail(err, "");
    throw err;
  }
  if (result.refusal) {
    await sendWhatsAppText(phone, copy.lostThread, invite.id);
    return { ready: false };
  }

  const ready = result.text.includes(READY_TOKEN);
  const reply = result.text.replaceAll(READY_TOKEN, "").trim();
  if (reply) await sendWhatsAppText(phone, reply, invite.id);
  return { ready };
}
