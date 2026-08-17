import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { LOCALE_COOKIE, isLocale } from "@/i18n/locales";
import { createAdmin } from "@/lib/supabase/admin";
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

  // On the home directory or a participant URL, ensure an anonymous Supabase
  // user exists so the page server component can read auth.uid(). The user can
  // later upgrade to phone-verified via the OTP flow without losing their
  // participant_id (their draft conversation is reassigned by /api/claim-draft).
  //
  // getUser() validates against the auth server (refreshing if needed), so a
  // null result means there is no usable session — a new visitor, or a
  // returning one whose anonymous JWT lapsed or whose user was removed. In
  // every such case minting is the right move: availability comes first, and
  // a stale cookie must never strand someone on "couldn't start your session."
  // This does NOT clobber a phone upgrade — right after OTP verify getUser()
  // returns the valid phone user, so we never enter this branch.
  const path = request.nextUrl.pathname;
  if (!data.user && (path === "/" || path.startsWith("/s/"))) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error(
        "[proxy] anonymous sign-in failed — enable Anonymous Sign-Ins in Supabase dashboard (Authentication → Providers):",
        error.message,
      );
    }
  }

  // Carry a signed-in participant's saved language onto this device. Only on a
  // visitor with no locale cookie at all — an existing cookie is either an
  // explicit choice or an earlier seed, and neither should be overwritten from
  // under them. Costs one keyed lookup on a first visit, never after.
  if (!request.cookies.get(LOCALE_COOKIE)) {
    // Reuse the getUser() above — a freshly minted anonymous user is skipped
    // by the is_anonymous check regardless, so a second round-trip buys nothing.
    const user = data.user;
    if (user && !user.is_anonymous) {
      const admin = createAdmin();
      const { data: row } = await admin
        .from("users")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      const preferred = row?.preferred_language;
      if (isLocale(preferred)) {
        response.cookies.set(LOCALE_COOKIE, preferred, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
