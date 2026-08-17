import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { ANALYSIS_PROMPT_PLACEHOLDERS } from "@/lib/prompts/analysis";
import { PERSPECTIVES_PLACEHOLDER } from "@/lib/prompts/facilitator";
import { SUMMARY_PROMPT_PLACEHOLDERS } from "@/lib/prompts/summary";
import { renameSession } from "@/lib/rename-session";
import { createAdmin } from "@/lib/supabase/admin";

type Body = {
  code?: string;
  topic?: string;
  intro_message?: string | null;
  context?: string | null;
  instructions?: string | null;
  status?: "open" | "closed";
  prompt_task_framing?: string | null;
  prompt_mechanics?: string | null;
  prompt_pacing?: string | null;
  prompt_perspectives_instructions?: string | null;
  prompt_analysis_system?: string | null;
  prompt_analysis_prompt?: string | null;
  prompt_summary_system?: string | null;
  prompt_summary_prompt?: string | null;
};

// Plain-text overrides → trim, empty becomes null (falls back to default).
function normalizePlainOverride(v: unknown): string | null {
  const s = (v ?? "").toString().trim();
  return s || null;
}

// Template overrides → same trim, but if non-empty must contain every required
// placeholder, otherwise the silent .replace() no-op would strip topic/transcript
// data from the prompt without warning.
function normalizeTemplateOverride(
  v: unknown,
  requiredPlaceholders: readonly string[],
): { ok: true; value: string | null } | { ok: false; missing: string[] } {
  const s = (v ?? "").toString().trim();
  if (!s) return { ok: true, value: null };
  const missing = requiredPlaceholders.filter((p) => !s.includes(p));
  if (missing.length) return { ok: false, missing };
  return { ok: true, value: s };
}

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
    update.intro_message = normalizePlainOverride(body.intro_message);
  }
  if ("context" in body) {
    update.context = normalizePlainOverride(body.context);
  }
  if ("instructions" in body) {
    update.instructions = normalizePlainOverride(body.instructions);
  }
  if (body.status === "open" || body.status === "closed") {
    update.status = body.status;
  }

  // Plain-text prompt overrides — no required placeholders.
  if ("prompt_task_framing" in body) {
    update.prompt_task_framing = normalizePlainOverride(body.prompt_task_framing);
  }
  if ("prompt_mechanics" in body) {
    update.prompt_mechanics = normalizePlainOverride(body.prompt_mechanics);
  }
  if ("prompt_pacing" in body) {
    update.prompt_pacing = normalizePlainOverride(body.prompt_pacing);
  }
  if ("prompt_analysis_system" in body) {
    update.prompt_analysis_system = normalizePlainOverride(body.prompt_analysis_system);
  }
  if ("prompt_summary_system" in body) {
    update.prompt_summary_system = normalizePlainOverride(body.prompt_summary_system);
  }

  // Template overrides — must preserve their placeholders or the silent
  // .replace() will leave the placeholder text in the prompt and strip the
  // data instead. Validate before persisting.
  const templateFields: Array<[
    keyof Body,
    string,
    readonly string[],
  ]> = [
    [
      "prompt_perspectives_instructions",
      "Perspectives instructions",
      [PERSPECTIVES_PLACEHOLDER],
    ],
    ["prompt_analysis_prompt", "Analysis prompt", ANALYSIS_PROMPT_PLACEHOLDERS],
    ["prompt_summary_prompt", "Summary prompt", SUMMARY_PROMPT_PLACEHOLDERS],
  ];
  for (const [field, label, placeholders] of templateFields) {
    if (!(field in body)) continue;
    const result = normalizeTemplateOverride(body[field], placeholders);
    if (!result.ok) {
      return new Response(
        `${label} is missing required placeholder(s): ${result.missing.join(", ")}`,
        { status: 400 },
      );
    }
    update[field] = result.value;
  }

  const newCode = typeof body.code === "string" ? body.code.trim() : code;
  const renaming = newCode !== code;

  if (Object.keys(update).length === 0 && !renaming) {
    return new Response("no fields to update", { status: 400 });
  }

  if (Object.keys(update).length > 0) {
    const admin = createAdmin();
    const { error } = await admin.from("sessions").update(update).eq("id", code);
    if (error) return new Response(error.message, { status: 400 });
  }

  // Rename last, so a rejected code (bad format, already taken) doesn't throw
  // away the other edits — they're already persisted under the old code.
  if (renaming) {
    const result = await renameSession(code, newCode);
    if (!result.ok) return new Response(result.error, { status: 400 });
  }

  return NextResponse.json({ ok: true, code: newCode });
}
