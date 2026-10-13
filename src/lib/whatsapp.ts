import { createPublicKey, verify } from "node:crypto";

import type { Locale } from "@/i18n/locales";
import { createAdmin } from "@/lib/supabase/admin";

// Tejido sends from the shared "Roley AI" WhatsApp number until it has its own
// Meta business. Templates live on that business account (WABA 918062554344710).
export const WHATSAPP_FROM = "+16282210583";
export const INVITE_TEMPLATE = "tejido_conversation_invite";

const TELNYX = "https://api.telnyx.com/v2";
// WhatsApp caps a text message at 4096 chars; split well under it.
const MAX_CHUNK = 3500;

function apiKey(): string {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new Error("TELNYX_API_KEY missing");
  return key;
}

type SendResult = { ok: true; id: string } | { ok: false; error: string };

async function postWhatsApp(to: string, message: unknown): Promise<SendResult> {
  const res = await fetch(`${TELNYX}/messages/whatsapp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ from: WHATSAPP_FROM, to, whatsapp_message: message }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 300)}` };
  const json = (await res.json().catch(() => null)) as { data?: { id?: string } } | null;
  return { ok: true, id: json?.data?.id ?? "" };
}

async function recordOutbound(
  id: string,
  phone: string,
  body: string,
  inviteId: string | null,
) {
  if (!id) return;
  await createAdmin()
    .from("whatsapp_messages")
    .insert({ id, direction: "out", phone, body, invite_id: inviteId, processed_at: new Date().toISOString() });
}

/**
 * Markdown → WhatsApp formatting. WhatsApp uses *bold* and _italic_ and has no
 * headings or links syntax, so headings become bold lines.
 */
export function toWhatsAppText(md: string): string {
  return md
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "*$1*")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)")
    .trim();
}

function chunk(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK) {
    const cut = Math.max(rest.lastIndexOf("\n\n", MAX_CHUNK), rest.lastIndexOf(". ", MAX_CHUNK));
    const at = cut > MAX_CHUNK / 2 ? cut + 1 : MAX_CHUNK;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at);
  }
  if (rest.trim()) parts.push(rest.trim());
  return parts;
}

/** Free-form text. Only delivers inside the 24h window after their last message. */
export async function sendWhatsAppText(
  to: string,
  markdown: string,
  inviteId: string | null = null,
): Promise<SendResult> {
  let last: SendResult = { ok: false, error: "empty message" };
  for (const body of chunk(toWhatsAppText(markdown))) {
    last = await postWhatsApp(to, { type: "text", text: { body } });
    if (!last.ok) return last;
    await recordOutbound(last.id, to, body, inviteId);
  }
  return last;
}

export async function sendInviteTemplate(
  to: string,
  language: Locale,
  topic: string,
  inviteId: string,
): Promise<SendResult> {
  const result = await postWhatsApp(to, {
    type: "template",
    template: {
      name: INVITE_TEMPLATE,
      language: { code: language === "es" ? "es" : "en_US", policy: "deterministic" },
      components: [
        {
          type: "body",
          parameters: [
            // Template params can't hold newlines or long runs of spaces.
            { type: "text", parameter_name: "topic", text: topic.replace(/\s+/g, " ").slice(0, 300) },
          ],
        },
        // Button payloads come back on the tap, naming the exact invite.
        ...["yes", "no"].map((answer, index) => ({
          type: "button",
          sub_type: "quick_reply",
          index,
          parameters: [{ type: "payload", payload: `invite:${inviteId}:${answer}` }],
        })),
      ],
    },
  });
  if (result.ok) await recordOutbound(result.id, to, `[template ${INVITE_TEMPLATE}] ${topic}`, inviteId);
  return result;
}

// --- Inbound ---------------------------------------------------------------

let cachedPublicKey: string | null = null;

async function telnyxPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await fetch(`${TELNYX}/public_key`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  const json = (await res.json()) as { data?: { public_key?: string } };
  const key = json.data?.public_key;
  if (!key) throw new Error("could not load Telnyx public key");
  cachedPublicKey = key;
  return key;
}

/**
 * Telnyx signs `${timestamp}|${rawBody}` with ed25519. Rejects anything older
 * than 5 minutes so a captured request can't be replayed.
 */
export async function verifyTelnyxSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  if (!signature || !timestamp) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const raw = Buffer.from(await telnyxPublicKey(), "base64");
  const key = createPublicKey({
    key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]),
    format: "der",
    type: "spki",
  });
  return verify(null, Buffer.from(`${timestamp}|${rawBody}`), key, Buffer.from(signature, "base64"));
}

export type InboundMessage = {
  id: string;
  phone: string;
  text: string | null;
  buttonPayload: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === "object" ? (v as Json) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/**
 * Pull what we need out of a Telnyx `message.received` webhook. The exact
 * WhatsApp payload shape isn't documented, so this checks the SMS-style
 * fields and the Meta-style nested ones; the raw payload is stored too.
 */
export function parseInbound(body: unknown): InboundMessage | null {
  const data = obj(obj(body)?.data);
  if (data?.event_type !== "message.received") return null;
  const p = obj(data.payload);
  if (!p) return null;

  const fromObj = obj(p.from);
  const phone = str(fromObj?.phone_number) ?? str(p.from);
  const id = str(p.id) ?? str(data.id);
  if (!phone || !id) return null;

  const wa = obj(p.whatsapp_message) ?? obj(p.whatsapp) ?? p;
  const button = obj(wa.button);
  const interactive = obj(wa.interactive);
  const buttonReply = obj(interactive?.button_reply);
  const buttonPayload =
    str(button?.payload) ?? str(buttonReply?.id) ?? null;

  const text =
    str(p.text) ??
    str(obj(wa.text)?.body) ??
    str(button?.text) ??
    str(buttonReply?.title) ??
    str(p.body);

  const media = Array.isArray(p.media) ? obj(p.media[0]) : null;
  const audio = obj(wa.audio) ?? obj(wa.voice);
  const mediaUrl = str(media?.url) ?? str(audio?.url) ?? str(audio?.link) ?? null;
  const mediaType = str(media?.content_type) ?? str(audio?.mime_type) ?? null;

  return { id, phone: phone.startsWith("+") ? phone : `+${phone}`, text, buttonPayload, mediaUrl, mediaType };
}

export async function downloadMedia(url: string): Promise<Blob> {
  // Telnyx-hosted media wants the API key. Never send it to any other host.
  const host = new URL(url).hostname;
  const isTelnyx = host === "telnyx.com" || host.endsWith(".telnyx.com");
  const res = await fetch(url, {
    headers: isTelnyx ? { Authorization: `Bearer ${apiKey()}` } : {},
  });
  if (!res.ok) throw new Error(`media download ${res.status}`);
  return res.blob();
}
