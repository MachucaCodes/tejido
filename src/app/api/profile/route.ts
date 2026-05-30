import { NextResponse } from "next/server";

import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

type Body = { full_name?: string; lot_number?: string };

// Returns the calling user's profile so the client can decide whether to
// prompt for name + lot. Returning users who already have these on file
// shouldn't be asked again when they sign in.
export async function GET() {
  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return new Response("not authenticated", { status: 401 });

  const admin = createAdmin();
  const { data } = await admin
    .from("users")
    .select("full_name, lot_number")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    full_name: data?.full_name ?? null,
    lot_number: data?.lot_number ?? null,
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const fullName = body.full_name?.trim() || null;
  const lotNumber = body.lot_number?.trim() || null;
  if (!fullName && !lotNumber) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return new Response("not authenticated", { status: 401 });

  const admin = createAdmin();
  const update: Record<string, string> = {};
  if (fullName) update.full_name = fullName;
  if (lotNumber) update.lot_number = lotNumber;

  const { error } = await admin
    .from("users")
    .upsert({ id: user.id, ...update }, { onConflict: "id" });
  if (error) return new Response(error.message, { status: 500 });

  return NextResponse.json({ ok: true });
}
