import { createClient as createServer } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

export type AdminUser = { id: string; phone: string | null };

export async function requireAdmin(): Promise<
  { ok: true; user: AdminUser } | { ok: false; reason: "unauth" | "not_admin" }
> {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, reason: "unauth" };

  const admin = createAdmin();
  const { data: row } = await admin
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (row?.role !== "admin") return { ok: false, reason: "not_admin" };

  return {
    ok: true,
    user: { id: data.user.id, phone: data.user.phone ?? null },
  };
}
