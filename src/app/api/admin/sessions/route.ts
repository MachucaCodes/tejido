import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

const CODE_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
      status: guard.reason === "unauth" ? 401 : 403,
    });
  }

  const { code, question } = (await req.json()) as { code?: string; question?: string };
  if (!code || !question) return new Response("code and question required", { status: 400 });
  if (!CODE_RE.test(code)) return new Response("invalid code format", { status: 400 });

  const admin = createAdmin();
  const { error } = await admin
    .from("sessions")
    .insert({ id: code, question, created_by: guard.user.id });
  if (error) {
    return new Response(error.code === "23505" ? "code already taken" : error.message, {
      status: 400,
    });
  }
  return NextResponse.json({ ok: true });
}
