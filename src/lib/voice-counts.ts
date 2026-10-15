import type { createAdmin } from "@/lib/supabase/admin";

// Voices per session = participants whose answers turned into at least one
// extracted point. Matches the "N voices" count on the room view; joining
// the link without saying anything doesn't count.
export async function voiceCountsBySession(
  admin: ReturnType<typeof createAdmin>,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data } = await admin
      .from("participants")
      .select("session_id, extracted_points!inner(id)")
      .order("id")
      .range(from, from + pageSize - 1);
    const rows = data ?? [];
    for (const r of rows) {
      counts.set(r.session_id, (counts.get(r.session_id) ?? 0) + 1);
    }
    if (rows.length < pageSize) break;
  }
  return counts;
}
