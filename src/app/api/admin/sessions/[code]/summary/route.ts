import { requireOrganizer } from "@/lib/admin-guard";
import { regenerateSummaryIfStale } from "@/lib/summary";
import { createAdmin } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Rebuild the session's summary now, even if the theme mix hasn't shifted
// enough to trigger it on its own.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await requireOrganizer();
  if (!guard.ok) return new Response("unauthenticated", { status: 401 });

  const { code } = await params;

  // Admins can rebuild any session; everyone else only the ones they created.
  if (!guard.isAdmin) {
    const { data: owned } = await createAdmin()
      .from("sessions")
      .select("id")
      .eq("id", code)
      .eq("created_by", guard.user.id)
      .maybeSingle();
    if (!owned) return new Response("not your session", { status: 403 });
  }

  try {
    const result = await regenerateSummaryIfStale(code, { force: true });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
}
