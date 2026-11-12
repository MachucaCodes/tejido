import { NextResponse } from "next/server";
import { after } from "next/server";

import { requireOrganizer } from "@/lib/admin-guard";
import type { CreateSessionError } from "@/lib/link-name";
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
  // Errors use the form's words (Link name, Question), not the column names.
  const refuse = (body: CreateSessionError, status = 400) => NextResponse.json(body, { status });
  if (!code) return refuse({ error: "Add a link name.", field: "code" });
  if (!topic?.trim()) return refuse({ error: "Add the question people are asked.", field: "topic" });
  if (!CODE_RE.test(code)) {
    return refuse({
      error: "Use lowercase letters, numbers and hyphens, starting with a letter or number.",
      field: "code",
    });
  }

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
    if (error.code === "23505") {
      return refuse({ error: "That link name is already used. Try another.", field: "code" }, 409);
    }
    console.error("create session failed", error);
    return refuse({ error: "Couldn't create the session. Try again." }, 500);
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
