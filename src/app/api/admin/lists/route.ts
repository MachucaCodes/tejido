import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
      status: guard.reason === "unauth" ? 401 : 403,
    });
  }

  const { name, description } = (await req.json()) as {
    name?: string;
    description?: string;
  };
  const trimmed = name?.trim();
  if (!trimmed) return new Response("name required", { status: 400 });

  const admin = createAdmin();
  const { data, error } = await admin
    .from("lists")
    .insert({
      name: trimmed,
      description: description?.trim() || null,
      created_by: guard.user.id,
    })
    .select("id")
    .single();
  if (error) {
    return new Response(
      error.code === "23505" ? "a list with that name already exists" : error.message,
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}
