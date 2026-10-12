import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { parseContactLines, upsertContacts } from "@/lib/contacts";
import { createAdmin } from "@/lib/supabase/admin";

async function guardOrResponse() {
  const guard = await requireAdmin();
  if (guard.ok) return null;
  return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
    status: guard.reason === "unauth" ? 401 : 403,
  });
}

// Add pasted numbers to the list. Returns the lines that weren't valid phone
// numbers so the admin can fix them; the valid ones are added regardless.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardOrResponse();
  if (denied) return denied;
  const { id } = await params;

  const { text, optedIn } = (await req.json()) as { text?: string; optedIn?: boolean };
  const { valid, invalid } = parseContactLines(text ?? "");
  if (valid.length === 0) {
    return NextResponse.json({ ok: false, added: 0, invalid }, { status: 400 });
  }

  const contactIds = await upsertContacts(valid, { optedIn: Boolean(optedIn) });
  const { error } = await createAdmin()
    .from("list_members")
    .upsert(
      contactIds.map((contact_id) => ({ list_id: id, contact_id })),
      { onConflict: "list_id,contact_id", ignoreDuplicates: true },
    );
  if (error) return new Response(error.message, { status: 400 });

  return NextResponse.json({ ok: true, added: contactIds.length, invalid });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardOrResponse();
  if (denied) return denied;
  const { id } = await params;

  const { contactId } = (await req.json()) as { contactId?: string };
  if (!contactId) return new Response("contactId required", { status: 400 });

  const { error } = await createAdmin()
    .from("list_members")
    .delete()
    .eq("list_id", id)
    .eq("contact_id", contactId);
  if (error) return new Response(error.message, { status: 400 });
  return NextResponse.json({ ok: true });
}
