"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

import { LOCALE_COOKIE, isLocale } from "./locales";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Record a language choice. The cookie is the source of truth (most visitors
 * here are anonymous), and for a phone-keyed account we mirror it to
 * `users.preferred_language` so the choice follows them to a new device — the
 * same reason the sign-in flow exists at all.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (user && !user.is_anonymous) {
    const admin = createAdmin();
    const { error } = await admin
      .from("users")
      .update({ preferred_language: locale })
      .eq("id", user.id);
    // A failed mirror is not worth blocking the switch — the cookie already
    // took effect and the preference simply won't follow them across devices.
    if (error) {
      console.error("[set-locale] could not persist preference:", error.message);
    }
  }

  revalidatePath("/", "layout");
}
