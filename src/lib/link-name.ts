/**
 * Turn what someone types into a link name (the session code in /s/<code>):
 * lowercase, accents dropped, spaces as hyphens, anything else left out.
 * "Maple Garden 2026" → "maple-garden-2026". A trailing hyphen is kept so
 * typing a space between words works.
 */
export function toLinkName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+/, "")
    .slice(0, 63);
}

// What the create route answers with when it refuses: a sentence in the
// form's own words, and the field it is about.
export type CreateSessionError = { error: string; field?: "code" | "topic" };
