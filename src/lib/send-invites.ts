import { createAdmin } from "@/lib/supabase/admin";
import { localized } from "@/lib/translate-session";
import { sendInviteTemplate } from "@/lib/whatsapp";
import { contactLanguage } from "@/lib/whatsapp-conversation";

export type SendInvitesResult = {
  sent: number;
  failed: number;
  alreadyInvited: number;
};

/**
 * Invite everyone on the given lists to a session over WhatsApp. A contact on
 * several lists gets one invite. Re-running only retries invites that failed or never went out.
 */
export async function sendInvites(sessionId: string, listIds: string[]): Promise<SendInvitesResult> {
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("id, topic, topic_es, status, archived_at")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("session not found");
  if (session.status !== "open" || session.archived_at) throw new Error("session is not open");

  const { data: members } = await admin
    .from("list_members")
    .select("contacts(id, phone, language)")
    .in("list_id", listIds)
    .overrideTypes<
      { contacts: { id: string; phone: string; language: string | null } | null }[],
      { merge: false }
    >();

  const contacts = new Map<string, { id: string; phone: string; language: string | null }>();
  for (const m of members ?? []) {
    if (m.contacts) contacts.set(m.contacts.id, m.contacts);
  }
  if (contacts.size === 0) return { sent: 0, failed: 0, alreadyInvited: 0 };

  await admin.from("session_invites").upsert(
    [...contacts.keys()].map((contact_id) => ({ session_id: sessionId, contact_id })),
    { onConflict: "session_id,contact_id", ignoreDuplicates: true },
  );

  const { data: invites } = await admin
    .from("session_invites")
    .select("id, contact_id, status")
    .eq("session_id", sessionId)
    .in("contact_id", [...contacts.keys()]);
  const toSend = (invites ?? []).filter((i) => i.status === "pending" || i.status === "failed");
  const alreadyInvited = (invites ?? []).length - toSend.length;

  let sent = 0;
  let failed = 0;
  // A few at a time: fast enough for a few hundred numbers, gentle on Telnyx.
  for (let i = 0; i < toSend.length; i += 5) {
    await Promise.all(
      toSend.slice(i, i + 5).map(async (invite) => {
        const contact = contacts.get(invite.contact_id)!;
        const lang = contactLanguage(contact);
        const topic = localized(session.topic, session.topic_es, lang) ?? session.topic;
        const result = await sendInviteTemplate(contact.phone, lang, topic, invite.id).catch(
          (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) }),
        );
        if (result.ok) sent += 1;
        else failed += 1;
        await admin
          .from("session_invites")
          .update(
            result.ok
              ? { status: "sent", sent_at: new Date().toISOString(), telnyx_message_id: result.id, error_message: null }
              : { status: "failed", error_message: result.error },
          )
          .eq("id", invite.id);
      }),
    );
  }

  return { sent, failed, alreadyInvited };
}
