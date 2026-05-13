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

  const { code, topic, intro_message, context, instructions } =
    (await req.json()) as {
      code?: string;
      topic?: string;
      intro_message?: string;
      context?: string;
      instructions?: string;
    };
  if (!code || !topic) return new Response("code and topic required", { status: 400 });
  if (!CODE_RE.test(code)) return new Response("invalid code format", { status: 400 });

  const admin = createAdmin();
  const { error } = await admin.from("sessions").insert({
    id: code,
    topic,
    intro_message: intro_message?.trim() || null,
    context: context?.trim() || null,
    instructions: instructions?.trim() || null,
    created_by: guard.user.id,
  });
  if (error) {
    return new Response(error.code === "23505" ? "code already taken" : error.message, {
      status: 400,
    });
  }
  return NextResponse.json({ ok: true });
}
