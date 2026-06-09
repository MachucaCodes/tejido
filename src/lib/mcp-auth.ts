import { createClient } from "@supabase/supabase-js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { createAdmin } from "@/lib/supabase/admin";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Verifies a Supabase OAuth 2.1 access token (issued via the OAuth Server
// feature) and requires the token's user to be an admin. MCP tools are
// admin-level (create/update sessions), and Supabase tokens are not
// audience-bound to this server, so the role check is the real gate.
export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const supabase = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(bearerToken);
  if (error || !data.user) return undefined;

  const admin = createAdmin();
  const { data: row } = await admin
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (row?.role !== "admin") return undefined;

  return {
    token: bearerToken,
    clientId: "supabase",
    scopes: [],
    extra: { userId: data.user.id },
  };
}
