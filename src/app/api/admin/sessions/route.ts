import { NextResponse } from "next/server";
import { after } from "next/server";

import { requireOrganizer } from "@/lib/admin-guard";
import { CODE_RE } from "@/lib/rename-session";
import { createAdmin } from "@/lib/supabase/admin";
import { backfillSessionTranslation } from "@/lib/translate-session";

export async function POST(req: Request) {
  const guard = await requireOrganizer();
  if (!guard.ok) return new Response("unauthenticated", { status: 401 });

  const { code, topic, intro_message, context, instructions, prompt_summary_system } =
    (await req.json()) as {
      code?: string;
      topic?: string;
      intro_message?: string;
      context?: string;
      instructions?: string;
      prompt_summary_system?: string;
    };
  if (!code || !topic) return new Response("code and topic required", { status: 400 });
  if (!CODE_RE.test(code)) return new Response("invalid code format", { status: 400 });

  const introMessage = intro_message?.trim() || null;

  const admin = createAdmin();
  const { error } = await admin.from("sessions").insert({
    id: code,
    topic,
    intro_message: introMessage,
    context: context?.trim() || null,
    instructions: instructions?.trim() || null,
    prompt_summary_system: prompt_summary_system?.trim() || null,
    created_by: guard.user.id,
  });
  if (error) {
    return new Response(error.code === "23505" ? "code already taken" : error.message, {
      status: 400,
    });
  }

  // Fill the Spanish copy after the response — the admin shouldn't wait on a
  // model call, and a failed translation just leaves the room reading English.
  after(() =>
    backfillSessionTranslation(
      code,
      { topic, intro_message: introMessage },
      { topic: true, intro_message: Boolean(introMessage) },
    ),
  );

  return NextResponse.json({ ok: true });
}
