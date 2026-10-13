import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

export type PersonMatch = {
  phone: string;
  name: string;
  lot: string | null;
  source: "contact" | "participant";
};

// Search people by name across WhatsApp contacts and past participants who
// signed in by phone. One row per phone; a contact's name wins.
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.reason === "unauth" ? "unauthenticated" : "not admin", {
      status: guard.reason === "unauth" ? 401 : 403,
    });
  }

  // Strip characters that mean something to ilike / PostgREST filters.
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%_,()*\\]/g, " ").trim();
  if (q.length < 2) return NextResponse.json({ people: [] });

  const admin = createAdmin();
  const [contacts, participants] = await Promise.all([
    admin.from("contacts").select("phone, name").ilike("name", `%${q}%`).order("name").limit(20),
    admin.rpc("search_people_by_name", { p_query: q }),
  ]);

  const byPhone = new Map<string, PersonMatch>();
  for (const c of contacts.data ?? []) {
    byPhone.set(c.phone, { phone: c.phone, name: c.name ?? "", lot: null, source: "contact" });
  }
  for (const p of (participants.data ?? []) as { phone: string; full_name: string; lot_number: string | null }[]) {
    const existing = byPhone.get(p.phone);
    if (existing) existing.lot ??= p.lot_number;
    else byPhone.set(p.phone, { phone: p.phone, name: p.full_name, lot: p.lot_number, source: "participant" });
  }

  return NextResponse.json({ people: [...byPhone.values()].slice(0, 20) });
}
