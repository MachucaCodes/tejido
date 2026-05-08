"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export type Theme = {
  id: string;
  short_name: string;
  description: string;
  count: number;
};

export function ThemesPanel({
  sessionCode,
  initialThemes,
}: {
  sessionCode: string;
  initialThemes: Theme[];
}) {
  const [themes, setThemes] = useState<Theme[]>(initialThemes);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "themes",
          filter: `session_id=eq.${sessionCode}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Theme;
            setThemes((prev) =>
              prev.some((t) => t.id === row.id)
                ? prev
                : [...prev, { ...row, count: 0 }],
            );
            setPulseId(row.id);
            setTimeout(() => setPulseId(null), 1200);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Theme;
            setThemes((prev) =>
              prev.map((t) =>
                t.id === row.id
                  ? { ...t, short_name: row.short_name, description: row.description }
                  : t,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            setThemes((prev) => prev.filter((t) => t.id !== row.id));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "theme_assignments" },
        (payload) => {
          const row = payload.new as { theme_id: string };
          setThemes((prev) =>
            prev.map((t) =>
              t.id === row.theme_id ? { ...t, count: t.count + 1 } : t,
            ),
          );
          setPulseId(row.theme_id);
          setTimeout(() => setPulseId(null), 1200);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, sessionCode]);

  const total = themes.reduce((acc, t) => acc + t.count, 0);

  return (
    <section className="flex w-full max-w-[40rem] flex-col gap-5">
      <header className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
          <ThreadGlyph />
          <span>From the room</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/80">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[var(--accent)]" />
          </span>
          Live
        </span>
      </header>

      <p
        className="font-display text-[1.55rem] italic leading-[1.18] tracking-[-0.005em] text-foreground/90 sm:text-[1.7rem]"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
      >
        What&apos;s weaving together
      </p>

      {themes.length === 0 ? (
        <p className="font-display text-[1rem] italic leading-relaxed text-muted-foreground sm:text-[1.05rem]">
          No threads yet — they appear here as more neighbors finish their
          conversations.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border/70 border-y border-border/70">
          {themes.map((t, i) => (
            <li
              key={t.id}
              className={cn(
                "group/theme grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-4 py-4 transition-colors",
                pulseId === t.id && "bg-[var(--accent)]/5",
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3
                  className="font-display text-[1.1rem] leading-snug text-foreground sm:text-[1.15rem]"
                  style={{ fontVariationSettings: '"opsz" 24, "SOFT" 60' }}
                >
                  {t.short_name}
                </h3>
                <p className="font-sans text-[0.92rem] leading-[1.55] text-muted-foreground">
                  {t.description}
                </p>
              </div>
              <span className="flex flex-col items-end gap-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                <span className="font-display text-[1.05rem] not-italic tabular-nums text-foreground/85">
                  {t.count}
                </span>
                <span>{t.count === 1 ? "voice" : "voices"}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {themes.length > 0 && (
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/70">
          <span aria-hidden>¶ </span>
          {themes.length} {themes.length === 1 ? "thread" : "threads"} ·{" "}
          <span className="tabular-nums">{total}</span>{" "}
          {total === 1 ? "voice" : "voices"} so far
        </p>
      )}
    </section>
  );
}

function ThreadGlyph() {
  return (
    <svg
      width="36"
      height="10"
      viewBox="0 0 36 10"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M1 5 C 4 1, 7 9, 11 5 S 18 1, 22 5 29 9, 35 5"
        stroke="var(--accent)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
