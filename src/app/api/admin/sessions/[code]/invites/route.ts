import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { sendInvites } from "@/lib/send-invites";

export const maxDuration = 300;

export async function POST(
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
  const { listIds } = (await req.json()) as { listIds?: string[] };
  if (!listIds?.length) return new Response("pick at least one list", { status: 400 });

  try {
    return NextResponse.json({ ok: true, ...(await sendInvites(code, listIds)) });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 400 });
  }
}
