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

  // A session already exists in the cookies if Supabase wrote an auth-token
  // cookie (possibly chunked: `sb-<ref>-auth-token.0`, `.1`, …). getUser()
  // can transiently return null while that session is mid-refresh — e.g. in
  // the moments after a phone OTP verify, when the browser client has just
  // swapped the anonymous session for the phone-keyed one and the new cookie
  // is still propagating. Minting a fresh anonymous user here would overwrite
  // that phone session, stranding the user on a brand-new empty account and
  // orphaning the conversation they just had. So we only mint when there is
  // no auth cookie at all (a genuinely new visitor).
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));

  // On the home directory or a participant URL, ensure an anonymous Supabase
  // user exists so the page server component can read auth.uid(). The user can
  // later upgrade to phone-verified via the OTP flow without losing their
  // participant_id (their draft conversation is reassigned by /api/claim-draft).
  const path = request.nextUrl.pathname;
  if (!data.user && !hasAuthCookie && (path === "/" || path.startsWith("/s/"))) {
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
