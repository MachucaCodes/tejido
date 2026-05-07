import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-only. Never import from client code.
export function createAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "tejido_next" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
