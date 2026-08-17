"use client";

import { useTransition } from "react";

import { LOCALES, type Locale } from "@/i18n/locales";
import { setLocale } from "@/i18n/set-locale";
import { logEvent } from "@/lib/client-log";
import { cn } from "@/lib/utils";

/**
 * Header language switch. Deliberately a two-state segmented chip rather than a
 * dropdown — with exactly two languages, the alternative should be one tap away
 * and readable without opening anything.
 */
export function LanguageToggle({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border/80 bg-background/60 p-0.5",
        pending && "opacity-60",
      )}
    >
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => {
              if (active) return;
              logEvent("header.locale.change", { from: locale, to: option });
              startTransition(() => setLocale(option));
            }}
            className={cn(
              "rounded-full px-2 py-0.5",
              "font-mono text-[9px] uppercase tracking-[0.22em] sm:text-[10px]",
              "transition-colors",
              active
                ? "bg-foreground/8 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
