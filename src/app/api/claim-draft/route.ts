import { NextResponse } from "next/server";

import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

type Body = { sessionCode?: string; anonUserId?: string };

export async function POST(req: Request) {
  const { sessionCode, anonUserId } = (await req.json().catch(() => ({}))) as Body;
  if (!sessionCode || !anonUserId) {
    return new Response("missing sessionCode or anonUserId", { status: 400 });
  }

  const supabase = await createServer();
  const { data: userRes } = await supabase.auth.getUser();
  const realUser = userRes.user;
  if (!realUser) return new Response("not authenticated", { status: 401 });
  if (realUser.id === anonUserId) {
    // Identity didn't change — phone was new and linked to the same anon user.
    // Nothing to reassign.
    return NextResponse.json({ ok: true, reassigned: false });
  }

  const admin = createAdmin();

  const { data: draft } = await admin
    .from("participants")
    .select("id, phase")
    .eq("session_id", sessionCode)
    .eq("user_id", anonUserId)
    .maybeSingle();

  const { data: existing } = await admin
    .from("participants")
    .select("id, phase")
    .eq("session_id", sessionCode)
    .eq("user_id", realUser.id)
    .maybeSingle();

  // Case 4: real user already completed this session. Discard the draft;
  // the existing complete participant is the canonical record.
  if (existing?.phase === "complete") {
    if (draft) await admin.from("participants").delete().eq("id", draft.id);
    await admin.auth.admin.deleteUser(anonUserId).catch(() => {});
    return NextResponse.json(
      { ok: false, reason: "already_complete" },
      { status: 409 },
    );
  }

  if (!draft) {
    // Real user has no draft from this anon session — nothing to reassign.
    // (Either case 2 with no prior, or anon user already cleaned up.)
    await admin.auth.admin.deleteUser(anonUserId).catch(() => {});
    return NextResponse.json({ ok: true, reassigned: false });
  }

  // Case 3: prior in-conversation row from a previous attempt by the real user.
  // Discard it — the draft they brought to phone-gate is the one they cared
  // enough to finish. Cascades transcripts/points/logs.
  if (existing?.phase === "in_conversation") {
    await admin.from("participants").delete().eq("id", existing.id);
  }

  // Cases 1, 2, 3: re-point ownership. Unique (session_id, user_id) is now
  // free thanks to the delete above (or was never taken).
  const { error: updateErr } = await admin
    .from("participants")
    .update({ user_id: realUser.id })
    .eq("id", draft.id);
  if (updateErr) {
    return new Response(`reassignment failed: ${updateErr.message}`, {
      status: 500,
    });
  }

  await admin.auth.admin.deleteUser(anonUserId).catch(() => {});

  return NextResponse.json({ ok: true, reassigned: true });
}
