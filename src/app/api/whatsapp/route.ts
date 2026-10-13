import { after } from "next/server";

import { createAdmin } from "@/lib/supabase/admin";
import { parseInbound, verifyTelnyxSignature } from "@/lib/whatsapp";
import { handleInbound } from "@/lib/whatsapp-conversation";

// Answering happens in after(): a facilitator turn plus analysis can take a
// couple of minutes, and Telnyx wants its 200 right away.
export const maxDuration = 300;

/**
 * Telnyx WhatsApp webhook. Stores every inbound message (raw payload too),
 * dedupes Telnyx retries on the message id, and answers in the background.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const ok = await verifyTelnyxSignature(
    raw,
    req.headers.get("telnyx-signature-ed25519"),
    req.headers.get("telnyx-timestamp"),
  ).catch(() => false);
  if (!ok) return new Response("bad signature", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // Status callbacks (sent, delivered, read) and anything else: acknowledge.
  const msg = parseInbound(body);
  if (!msg) return Response.json({ ok: true, ignored: true });

  const { error } = await createAdmin()
    .from("whatsapp_messages")
    .insert({
      id: msg.id,
      direction: "in",
      phone: msg.phone,
      body: msg.text,
      media_url: msg.mediaUrl,
      raw: { ...(body as object), _parsed: msg },
    });
  if (error) {
    // Already stored: a Telnyx retry of a message we're handling.
    if (error.code === "23505") return Response.json({ ok: true, duplicate: true });
    return new Response(error.message, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  after(() => handleInbound(msg.id, msg.phone, origin));
  return Response.json({ ok: true });
}
