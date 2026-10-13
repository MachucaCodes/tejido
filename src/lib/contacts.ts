import { isLocale, type Locale } from "@/i18n/locales";
import { DEFAULT_COUNTRY_ISO, parseLocalPhone } from "@/lib/countries";
import { createAdmin } from "@/lib/supabase/admin";

export type ContactLine = { phone: string; name: string | null; language: Locale | null };

/**
 * Parse pasted contacts, one per line: `phone`, `phone, name` or
 * `phone, name, en|es` (tabs work too, so a spreadsheet paste just works). Numbers without a `+`
 * are read as Costa Rica, same default as the phone sign-in.
 */
export function parseContactLines(text: string): {
  valid: ContactLine[];
  invalid: string[];
} {
  const byPhone = new Map<string, ContactLine>();
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [phonePart, ...rest] = line.split(/[,\t;]/).map((part) => part.trim());
    const langPart = rest.map((r) => r.toLowerCase()).find(isLocale) ?? null;
    const namePart = rest.filter((r) => r && r.toLowerCase() !== langPart).join(", ");
    const parsed = parseLocalPhone(DEFAULT_COUNTRY_ISO, phonePart);
    if (!parsed.ok) {
      invalid.push(line);
      continue;
    }
    // A repeated number keeps the name/language from whichever line had one.
    const prev = byPhone.get(parsed.e164);
    byPhone.set(parsed.e164, {
      phone: parsed.e164,
      name: namePart || prev?.name || null,
      language: langPart ?? prev?.language ?? null,
    });
  }
  return { valid: [...byPhone.values()], invalid };
}

/**
 * Find-or-create a contact per phone and return their ids. A name or language
 * on the line overwrites the stored one; a blank leaves it alone.
 */
export async function upsertContacts(lines: ContactLine[]): Promise<string[]> {
  if (lines.length === 0) return [];
  const admin = createAdmin();
  const phones = lines.map((l) => l.phone);

  const { data: existing, error: selErr } = await admin
    .from("contacts")
    .select("id, phone, name, language")
    .in("phone", phones);
  if (selErr) throw new Error(selErr.message);
  const known = new Map((existing ?? []).map((c) => [c.phone as string, c]));

  const toInsert = lines
    .filter((l) => !known.has(l.phone))
    .map((l) => ({ phone: l.phone, name: l.name, language: l.language }));
  if (toInsert.length) {
    const { data: inserted, error } = await admin
      .from("contacts")
      .insert(toInsert)
      .select("id, phone, name, language");
    if (error) throw new Error(error.message);
    for (const c of inserted ?? []) known.set(c.phone, c);
  }

  for (const l of lines) {
    const c = known.get(l.phone);
    if (!c) continue;
    const patch: { name?: string; language?: string } = {};
    if (l.name && l.name !== c.name) patch.name = l.name;
    if (l.language && l.language !== c.language) patch.language = l.language;
    if (Object.keys(patch).length) {
      await admin.from("contacts").update(patch).eq("id", c.id);
    }
  }

  return phones.map((p) => known.get(p)!.id as string);
}
