import { DEFAULT_COUNTRY_ISO, parseLocalPhone } from "@/lib/countries";
import { createAdmin } from "@/lib/supabase/admin";

export type ContactLine = { phone: string; name: string | null };

/**
 * Parse pasted contacts, one per line: `phone` or `phone, name` (a tab works
 * too, so a two-column spreadsheet paste just works). Numbers without a `+`
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
    const cut = line.search(/[,\t;]/);
    const phonePart = cut === -1 ? line : line.slice(0, cut);
    const namePart = cut === -1 ? "" : line.slice(cut + 1).trim();
    const parsed = parseLocalPhone(DEFAULT_COUNTRY_ISO, phonePart);
    if (!parsed.ok) {
      invalid.push(line);
      continue;
    }
    // A repeated number keeps the name from whichever line had one.
    const prevName = byPhone.get(parsed.e164)?.name ?? null;
    byPhone.set(parsed.e164, { phone: parsed.e164, name: namePart || prevName });
  }
  return { valid: [...byPhone.values()], invalid };
}

/**
 * Find-or-create a contact per phone and return their ids. A name on the line
 * overwrites the stored one; a blank name leaves it alone. `optedIn` stamps
 * consent on contacts that don't have it yet — it never clears it.
 */
export async function upsertContacts(
  lines: ContactLine[],
  { optedIn }: { optedIn: boolean },
): Promise<string[]> {
  if (lines.length === 0) return [];
  const admin = createAdmin();
  const phones = lines.map((l) => l.phone);

  const { data: existing, error: selErr } = await admin
    .from("contacts")
    .select("id, phone, name")
    .in("phone", phones);
  if (selErr) throw new Error(selErr.message);
  const known = new Map((existing ?? []).map((c) => [c.phone as string, c]));

  const now = new Date().toISOString();
  const toInsert = lines
    .filter((l) => !known.has(l.phone))
    .map((l) => ({ phone: l.phone, name: l.name, opted_in_at: optedIn ? now : null }));
  if (toInsert.length) {
    const { data: inserted, error } = await admin
      .from("contacts")
      .insert(toInsert)
      .select("id, phone, name");
    if (error) throw new Error(error.message);
    for (const c of inserted ?? []) known.set(c.phone, c);
  }

  for (const l of lines) {
    const c = known.get(l.phone);
    if (c && l.name && l.name !== c.name) {
      await admin.from("contacts").update({ name: l.name }).eq("id", c.id);
    }
  }
  if (optedIn) {
    await admin
      .from("contacts")
      .update({ opted_in_at: now })
      .in("phone", phones)
      .is("opted_in_at", null);
  }

  return phones.map((p) => known.get(p)!.id as string);
}
