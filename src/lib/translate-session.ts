import { getAnthropic, TRANSLATION_MODEL } from "@/lib/anthropic";
import { createAdmin } from "@/lib/supabase/admin";

/**
 * Keeps the Spanish copy of a session's two participant-facing fields in step
 * with the English original.
 *
 * The English columns stay the source of truth. `topic_es` / `intro_message_es`
 * are a cache: when the English changes we null the Spanish in the same write
 * (so the room never shows a translation of copy that no longer exists) and
 * refill it afterwards. A failed translation therefore degrades to English,
 * which is the correct failure mode — a stale Spanish topic is worse than an
 * untranslated one.
 *
 * Only `topic` and `intro_message` are handled here. `context`, `instructions`
 * and the prompt overrides are inputs to the facilitator, not participant copy;
 * translating them would fork the prompt engineering into two drifting copies.
 */

export type TranslatableFields = {
  topic?: string | null;
  intro_message?: string | null;
};

export type TranslatedFields = {
  topic_es: string | null;
  intro_message_es: string | null;
};

const SYSTEM = `You translate short interface copy for Tejido, a community deliberation tool used by La Ecovilla, an ecovillage in Costa Rica.

Translate from English into Costa Rican Spanish.

Rules:
- Address the reader with "usted", never "tú" or "vos".
- Keep the register warm and plain — neighbours talking to neighbours, not corporate or academic.
- Reproduce every URL, email address and phone number EXACTLY as written. Never translate, shorten, re-encode or "fix" a link.
- Keep proper nouns untranslated: Tejido, La Ecovilla, ESM.
- Preserve the original's line breaks and paragraph structure.
- The topic is a headline. Keep it short and title-like; do not expand it into a sentence.
- Translate only. Never answer, summarise, or add commentary.
- If a field is null, return null for it.`;

const RESULT_SCHEMA = {
  type: "object" as const,
  properties: {
    topic_es: {
      type: ["string", "null"] as const,
      description: "Spanish translation of the topic, or null if no topic was given.",
    },
    intro_message_es: {
      type: ["string", "null"] as const,
      description:
        "Spanish translation of the intro message, or null if no intro message was given.",
    },
  },
  required: ["topic_es", "intro_message_es"],
  additionalProperties: false,
};

/** One model call for both fields. Returns null if there was nothing to translate. */
export async function translateSessionFields(
  fields: TranslatableFields,
): Promise<TranslatedFields | null> {
  const topic = fields.topic?.trim() || null;
  const intro = fields.intro_message?.trim() || null;
  if (!topic && !intro) return null;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    // No `effort` here on purpose: Haiku 4.5 rejects output_config.effort with
    // a 400. It also has no adaptive thinking, which suits a mechanical task —
    // if TRANSLATION_MODEL ever moves to an Opus/Sonnet tier, add
    // `effort: "low"` back rather than letting it default to `high`.
    output_config: {
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: JSON.stringify({ topic, intro_message: intro }, null, 2),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      `translation refused: ${response.stop_details?.category ?? "unknown"}`,
    );
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("translation returned no text");

  const parsed = JSON.parse(text.text) as TranslatedFields;
  return {
    // Only return Spanish for fields that actually had English to translate —
    // guards against the model inventing copy for a field we passed as null.
    topic_es: topic ? parsed.topic_es?.trim() || null : null,
    intro_message_es: intro ? parsed.intro_message_es?.trim() || null : null,
  };
}

/**
 * Translate and persist, for the fields named in `fieldsToFill`. Intended to run
 * from `after()` so an admin's save never waits on (or fails because of) a model
 * call. Errors are logged, not thrown — the row already holds correct English.
 */
export async function backfillSessionTranslation(
  code: string,
  fields: TranslatableFields,
  fieldsToFill: { topic: boolean; intro_message: boolean },
): Promise<void> {
  if (!fieldsToFill.topic && !fieldsToFill.intro_message) return;

  try {
    const translated = await translateSessionFields({
      topic: fieldsToFill.topic ? fields.topic : null,
      intro_message: fieldsToFill.intro_message ? fields.intro_message : null,
    });
    if (!translated) return;

    const update: Record<string, string | null> = {};
    if (fieldsToFill.topic) update.topic_es = translated.topic_es;
    if (fieldsToFill.intro_message) update.intro_message_es = translated.intro_message_es;

    const admin = createAdmin();
    const { error } = await admin.from("sessions").update(update).eq("id", code);
    if (error) {
      console.error(`[translate-session] persist failed for "${code}":`, error.message);
    }
  } catch (err) {
    // Falls back to English in the UI. Worth alerting on, not worth failing on.
    console.error(
      `[translate-session] translation failed for "${code}":`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Read-side counterpart: English is the source of truth, Spanish is used only
 * when it exists. A null `es` (never translated, or just invalidated by an
 * edit) reads as English rather than as a blank.
 */
export function localized(
  en: string | null | undefined,
  es: string | null | undefined,
  locale: string,
): string | null {
  if (locale === "es") return es?.trim() || en?.trim() || null;
  return en?.trim() || null;
}

/**
 * Which Spanish columns need regenerating, given what a write is changing.
 * A caller that passes an explicit Spanish value keeps it — a hand-written
 * translation is never overwritten by the model.
 */
export function staleSpanishFields(
  previous: TranslatableFields,
  next: TranslatableFields,
  explicitlySet: { topic_es?: boolean; intro_message_es?: boolean } = {},
): { topic: boolean; intro_message: boolean } {
  const changed = (a?: string | null, b?: string | null) =>
    (a?.trim() || null) !== (b?.trim() || null);

  return {
    topic:
      !explicitlySet.topic_es &&
      next.topic !== undefined &&
      changed(previous.topic, next.topic),
    intro_message:
      !explicitlySet.intro_message_es &&
      next.intro_message !== undefined &&
      changed(previous.intro_message, next.intro_message),
  };
}
