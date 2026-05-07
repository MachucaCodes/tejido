import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  // On a participant URL, ensure an anonymous Supabase user exists so the page
  // server component can read auth.uid(). The user can later upgrade to phone-verified
  // via auth.updateUser({phone}) without losing their participant_id.
  if (!data.user && request.nextUrl.pathname.startsWith("/s/")) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error(
        "[proxy] anonymous sign-in failed — enable Anonymous Sign-Ins in Supabase dashboard (Authentication → Providers):",
        error.message,
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
