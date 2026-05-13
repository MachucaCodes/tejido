import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

type Body = {
  topic?: string;
  intro_message?: string | null;
  context?: string | null;
  instructions?: string | null;
  status?: "open" | "closed";
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
      status: guard.reason === "unauth" ? 401 : 403,
    });
  }

  const { code } = await params;
  const body = (await req.json()) as Body;

  const update: Record<string, unknown> = {};
  if (typeof body.topic === "string") {
    const t = body.topic.trim();
    if (!t) return new Response("topic cannot be empty", { status: 400 });
    update.topic = t;
  }
  if ("intro_message" in body) {
    const v = (body.intro_message ?? "").toString().trim();
    update.intro_message = v || null;
  }
  if ("context" in body) {
    const v = (body.context ?? "").toString().trim();
    update.context = v || null;
  }
  if ("instructions" in body) {
    const v = (body.instructions ?? "").toString().trim();
    update.instructions = v || null;
  }
  if (body.status === "open" || body.status === "closed") {
    update.status = body.status;
  }
  if (Object.keys(update).length === 0) {
    return new Response("no fields to update", { status: 400 });
  }

  const admin = createAdmin();
  const { error } = await admin.from("sessions").update(update).eq("id", code);
  if (error) return new Response(error.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
