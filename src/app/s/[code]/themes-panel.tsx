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

export type Point = {
  id: string;
  surface_phrase: string;
  theme_ids: string[];
};

const OUTLIER_SAMPLE_SIZE = 3;

export function ThemesPanel({
  sessionCode,
  initialThemes,
  initialSummary,
  initialPoints = [],
  analyzing = false,
}: {
  sessionCode: string;
  initialThemes: Theme[];
  initialSummary?: { text: string | null; generatedAt: string | null };
  initialPoints?: Point[];
  analyzing?: boolean;
}) {
  const [themes, setThemes] = useState<Theme[]>(initialThemes);
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(
    initialSummary?.text ?? null,
  );
  const supabase = useMemo(() => createClient(), []);

  // The panel often mounts via a parent state flip (hasAnalyzed → true)
  // BEFORE the server-side router.refresh resolves, so initialThemes can
  // be the stale empty snapshot from the original page load. When fresh
  // server data arrives as a new prop, sync local state so the panel
  // shows the just-written themes. Realtime updates that arrived in the
  // gap will re-arrive via subscription.
  useEffect(() => {
    setThemes(initialThemes);
  }, [initialThemes]);

  // Same gap exists for summary_text: a freshly-generated summary lands
  // in initialSummary on the next router.refresh, but the state was
  // already initialized from the first (often empty) prop.
  useEffect(() => {
    if (initialSummary?.text) setSummaryText(initialSummary.text);
  }, [initialSummary?.text]);

  // Belt-and-suspenders: if we still don't have a summary in state, pull
  // it directly. Covers the case where the after()-driven regen wrote
  // the summary AFTER the initial server render, the realtime UPDATE
  // payload didn't carry summary_text, and we never got a router.refresh
  // for this session. The sessions row is readable by any authenticated
  // user under the existing RLS policy.
  useEffect(() => {
    if (summaryText) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("summary_text")
        .eq("id", sessionCode)
        .maybeSingle();
      if (cancelled) return;
      if (data?.summary_text) setSummaryText(data.summary_text);
    })();
    return () => {
      cancelled = true;
    };
    // Re-run only when we transition from "no summary" to "have summary"
    // — equivalent in spirit to the themes catch-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryText === null, sessionCode, supabase]);

  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  // Belt-and-suspenders: if we mounted with an empty prop AND there's no
  // pending analysis, do a one-shot fetch. Covers the "first participant
  // in the session" path where router.refresh races with the panel mount
  // and Realtime can't backfill (the INSERT events fired before the
  // subscription was open).
  useEffect(() => {
    if (themes.length > 0) return;
    let cancelled = false;
    void (async () => {
      const [themeRes, asnRes] = await Promise.all([
        supabase
          .from("themes")
          .select("id, short_name, description")
          .eq("session_id", sessionCode),
        supabase
          .from("theme_assignments")
          .select("theme_id, themes!inner(session_id)")
          .eq("themes.session_id", sessionCode),
      ]);
      if (cancelled || !themeRes.data) return;
      const counts: Record<string, number> = {};
      for (const a of (asnRes.data ?? []) as Array<{ theme_id: string }>) {
        counts[a.theme_id] = (counts[a.theme_id] ?? 0) + 1;
      }
      const fetched: Theme[] = themeRes.data.map((t) => ({
        id: t.id,
        short_name: t.short_name,
        description: t.description,
        count: counts[t.id] ?? 0,
      }));
      if (fetched.length > 0) setThemes(fetched);
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the visible-themes count flips between zero and
    // non-zero. We don't want a re-fetch on every count-tick from
    // Realtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes.length === 0, sessionCode, supabase]);

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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "theme_assignments" },
        (payload) => {
          // Re-analysis (and any cascade-delete from removing the
          // underlying point) drops assignments. Realtime sends the
          // composite PK on DELETE by default, which is enough to
          // decrement the right theme's count without re-fetching.
          const row = payload.old as { theme_id?: string };
          if (!row.theme_id) return;
          const themeId = row.theme_id;
          setThemes((prev) =>
            prev.map((t) =>
              t.id === themeId ? { ...t, count: Math.max(0, t.count - 1) } : t,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionCode}`,
        },
        (payload) => {
          const row = payload.new as { summary_text: string | null };
          if (row.summary_text) setSummaryText(row.summary_text);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, sessionCode]);

  const total = themes.reduce((acc, t) => acc + t.count, 0);

  const pointsByTheme = useMemo(() => {
    const map = new Map<string, Point[]>();
    for (const p of points) {
      for (const tid of p.theme_ids) {
        const arr = map.get(tid);
        if (arr) arr.push(p);
        else map.set(tid, [p]);
      }
    }
    return map;
  }, [points]);

  // Outliers: surface_phrases of points whose ALL assigned themes sit at
  // or below the median count. Random sample, stable per-render via the
  // points/themes deps. Only renders when there are points to draw from
  // AND the room has enough variety for "below median" to mean anything.
  const outlierPhrases = useMemo(() => {
    if (themes.length < 3 || points.length === 0) return [];
    const sortedCounts = [...themes.map((t) => t.count)].sort((a, b) => a - b);
    const mid = Math.floor(sortedCounts.length / 2);
    const median =
      sortedCounts.length % 2 === 0
        ? (sortedCounts[mid - 1] + sortedCounts[mid]) / 2
        : sortedCounts[mid];
    const lowThemeIds = new Set(
      themes.filter((t) => t.count <= median).map((t) => t.id),
    );
    const candidates = points.filter(
      (p) =>
        p.theme_ids.length > 0 && p.theme_ids.every((id) => lowThemeIds.has(id)),
    );
    const phrases = Array.from(
      new Set(candidates.map((p) => p.surface_phrase)),
    );
    // Fisher-Yates with a deterministic enough seed for one render.
    const shuffled = [...phrases];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, OUTLIER_SAMPLE_SIZE);
  }, [points, themes]);

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

      {summaryText && (
        <p className="font-sans text-[0.98rem] leading-[1.6] text-foreground/85 sm:text-[1.02rem]">
          {summaryText}
        </p>
      )}

      {analyzing && (
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/80">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]/70" aria-hidden />
          Updating
        </span>
      )}

      {themes.length === 0 ? (
        <p className="font-display text-[1rem] italic leading-relaxed text-muted-foreground sm:text-[1.05rem]">
          No threads yet — they appear here as more neighbors finish their
          conversations.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border/70 border-y border-border/70">
          {themes.map((t, i) => {
            const isExpanded = expandedThemeId === t.id;
            const themePoints = pointsByTheme.get(t.id) ?? [];
            const phrases = Array.from(
              new Set(themePoints.map((p) => p.surface_phrase)),
            );
            const canExpand = phrases.length > 0;
            return (
              <li
                key={t.id}
                className={cn(
                  "group/theme transition-colors",
                  pulseId === t.id && "bg-[var(--accent)]/5",
                )}
              >
                <button
                  type="button"
                  disabled={!canExpand}
                  onClick={() =>
                    setExpandedThemeId((prev) => (prev === t.id ? null : t.id))
                  }
                  aria-expanded={isExpanded}
                  className={cn(
                    "grid w-full grid-cols-[2.25rem_1fr_auto] items-baseline gap-4 py-4 text-left",
                    canExpand
                      ? "cursor-pointer hover:bg-foreground/[0.015]"
                      : "cursor-default",
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
                      {canExpand && (
                        <span
                          className={cn(
                            "ml-2 inline-block font-mono text-[10px] tracking-[0.2em] text-muted-foreground/60 transition-transform",
                            isExpanded && "rotate-90",
                          )}
                          aria-hidden
                        >
                          ›
                        </span>
                      )}
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
                </button>
                {isExpanded && phrases.length > 0 && (
                  <ul className="grid grid-cols-[2.25rem_1fr] gap-x-4 pb-5">
                    <span aria-hidden />
                    <div className="flex flex-col gap-2 border-l border-border/70 pl-4">
                      {phrases.map((phrase) => (
                        <li
                          key={phrase}
                          className="font-display text-[0.98rem] italic leading-[1.5] text-foreground/80"
                          style={{ fontVariationSettings: '"opsz" 24, "SOFT" 80' }}
                        >
                          &ldquo;{phrase}&rdquo;
                        </li>
                      ))}
                    </div>
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {outlierPhrases.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-border/70 pt-5">
          <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
            <span>Unique perspectives</span>
          </div>
          <p className="font-sans text-[0.82rem] leading-[1.5] text-muted-foreground/80">
            Threads that didn&apos;t gather a crowd, but might be worth a moment.
          </p>
          <ul className="flex flex-col gap-2.5 border-l border-[var(--accent)]/40 pl-4">
            {outlierPhrases.map((phrase) => (
              <li
                key={phrase}
                className="font-display text-[1.02rem] italic leading-[1.5] text-foreground/85"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 80' }}
              >
                &ldquo;{phrase}&rdquo;
              </li>
            ))}
          </ul>
        </section>
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
