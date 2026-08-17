import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
} from "./locales";

/**
 * Locale resolution, in order:
 *   1. the NEXT_LOCALE cookie — an explicit choice, or one seeded from the
 *      signed-in user's saved preference by the proxy
 *   2. the browser's Accept-Language header
 *   3. English
 *
 * Deliberately cookie-first and DB-free: this runs on every server render, and
 * most visitors here are anonymous.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale = isLocale(fromCookie) ? fromCookie : null;

  if (!locale) {
    const headerStore = await headers();
    locale = localeFromAcceptLanguage(headerStore.get("accept-language"));
  }

  locale ??= DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
