import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

async function guardOrResponse() {
  const guard = await requireAdmin();
  if (guard.ok) return null;
  return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
    status: guard.reason === "unauth" ? 401 : 403,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardOrResponse();
  if (denied) return denied;
  const { id } = await params;

  const body = (await req.json()) as { name?: string; description?: string | null };
  const patch: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return new Response("name required", { status: 400 });
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (Object.keys(patch).length === 0) return new Response("nothing to update", { status: 400 });

  const { error } = await createAdmin().from("lists").update(patch).eq("id", id);
  if (error) {
    return new Response(
      error.code === "23505" ? "a list with that name already exists" : error.message,
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

// Deleting a list removes its memberships only. Contacts stay, since they may
// belong to other lists or already have invites.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardOrResponse();
  if (denied) return denied;
  const { id } = await params;

  const { error } = await createAdmin().from("lists").delete().eq("id", id);
  if (error) return new Response(error.message, { status: 400 });
  return NextResponse.json({ ok: true });
}
