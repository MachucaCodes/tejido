"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export type Theme = {
  id: string;
  short_name: string;
  description: string;
};

export type Point = {
  id: string;
  surface_phrase: string;
  theme_ids: string[];
  participant_id: string;
};

const OUTLIER_SAMPLE_SIZE = 3;
// Cap how many phrases we render under an expanded theme. With ~500
// participants a popular theme can collect hundreds of points; showing
// them all turns the panel into a wall of text. Everything past the cap
// is reachable via the "see all" link to the points drilldown.
const THEME_PHRASE_PREVIEW = 8;
// Drop one- or two-word fragments like "curiosity" that the analysis pass
// occasionally emits as a surface_phrase. Out of context they read as noise
// and reinforce the "outliers are random" perception we're fixing.
const OUTLIER_MIN_PHRASE_CHARS = 25;

// FNV-1a 32-bit. Used to give the outliers a stable, content-seeded
// pseudo-random order. Math.random in the previous shuffle was a React
// purity / SSR-hydration footgun — server and client picked different
// values, so the rendered DOM didn't match. This produces the same
// "feels shuffled" ordering on both sides.
const fnv1a = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h >>> 0;
};

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
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(
    initialSummary?.text ?? null,
  );
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Realtime gives instant feedback (count nudges, theme renames) but
  // can drop or reorder events during a re-analysis burst, leaving the
  // panel out of sync. Debounce a router.refresh on any event so the
  // server-side admin fetch reconciles state once the storm settles —
  // and so participants who didn't trigger the change still pick it up.
  const refreshTimerRef = useRef<number | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 1500);
  }, [router]);

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
      const { data } = await supabase
        .from("themes")
        .select("id, short_name, description")
        .eq("session_id", sessionCode);
      if (cancelled || !data || data.length === 0) return;
      setThemes(data);
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the visible-themes count flips between zero and
    // non-zero. We don't want a re-fetch on every realtime tick.
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
              prev.some((t) => t.id === row.id) ? prev : [...prev, row],
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
          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "theme_assignments" },
        (payload) => {
          // Pulse the theme for immediate feedback, but don't try to
          // increment a local count — voice counts are derived from
          // points (deduped by participant_id) and the assignment row
          // alone doesn't tell us whether this point's participant was
          // already counted. The debounced router.refresh below pulls
          // fresh points and reconciles the displayed count.
          const row = payload.new as { theme_id: string };
          setPulseId(row.theme_id);
          setTimeout(() => setPulseId(null), 1200);
          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "theme_assignments" },
        () => {
          // Re-analysis (and cascade-delete from removing a point) drops
          // assignments. Counts are derived from points, so we just
          // schedule a refresh and let the new prop snapshot reconcile.
          scheduleRefresh();
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
          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [supabase, sessionCode, scheduleRefresh]);

  const voiceCount = useMemo(() => {
    const ids = new Set<string>();
    for (const p of points) {
      if (p.participant_id) ids.add(p.participant_id);
    }
    return ids.size;
  }, [points]);

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

  // Voices per theme = unique participants whose points landed on it.
  // Counting assignment rows over-counts: one participant whose
  // transcript yields multiple points under the same theme would
  // otherwise show up as multiple voices.
  const themeVoiceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const [tid, pts] of pointsByTheme) {
      const ids = new Set<string>();
      for (const p of pts) {
        if (p.participant_id) ids.add(p.participant_id);
      }
      map.set(tid, ids.size);
    }
    return map;
  }, [pointsByTheme]);

  // Outliers: surface_phrases of points that are genuinely rare in the
  // room — either unclustered, or belonging only to tiny clusters (every
  // assigned theme has count ≤ 2). The previous "at or below median" rule
  // captured ~half the room by construction and read as random; this one
  // surfaces just the voices that didn't gather a crowd. Ordering is a
  // content-seeded pseudo-shuffle: stable for a given (sessionCode,
  // phrase) pair so SSR and hydration agree, but the order varies across
  // sessions and shifts naturally as new outliers appear or the room
  // grows. Only renders once the room has enough material that "rare"
  // actually means something.
  const outlierPhrases = useMemo(() => {
    if (themes.length < 3 || points.length === 0) return [];
    const candidates = points.filter((p) => {
      if (p.surface_phrase.trim().length < OUTLIER_MIN_PHRASE_CHARS) return false;
      if (p.theme_ids.length === 0) return true;
      return p.theme_ids.every((id) => (themeVoiceCounts.get(id) ?? 0) <= 2);
    });
    const phrases = Array.from(
      new Set(candidates.map((p) => p.surface_phrase)),
    );
    return phrases
      .map((phrase) => ({ phrase, key: fnv1a(`${sessionCode}:${phrase}`) }))
      .sort((a, b) => a.key - b.key)
      .slice(0, OUTLIER_SAMPLE_SIZE)
      .map((e) => e.phrase);
  }, [points, themes, themeVoiceCounts, sessionCode]);

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

      {/* Synthesis — the woven picture. Tinted with the deep-green --primary
          so it reads as a distinct zone from the rust-accented voices below. */}
      <div className="rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary)]/[0.05] px-5 py-5 sm:px-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[var(--primary)]/85">
          <span>The shared picture</span>
          {analyzing && (
            <span className="ml-auto flex items-center gap-1.5 text-muted-foreground/80">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]/70" aria-hidden />
              Updating
            </span>
          )}
        </div>
        <p
          className="font-display text-[1.55rem] italic leading-[1.18] tracking-[-0.005em] text-foreground/90 sm:text-[1.7rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          What your neighbors are feeling…
        </p>
        {summaryText && (
          <p className="mt-3 font-sans text-[0.98rem] leading-[1.6] text-foreground/85 sm:text-[1.02rem]">
            {summaryText}
          </p>
        )}
      </div>

      {themes.length === 0 ? (
        analyzing ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3.5">
            <span
              className="size-2 animate-pulse rounded-full bg-[var(--accent)]"
              aria-hidden
            />
            <p className="font-display text-[0.98rem] italic leading-relaxed text-foreground/80 sm:text-[1.02rem]">
              Pulling your perspective into the group view…
            </p>
          </div>
        ) : (
          <p className="font-display text-[1rem] italic leading-relaxed text-muted-foreground sm:text-[1.05rem]">
            No themes yet — they appear here as more neighbors finish their
            conversations.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {/* Bridges the synthesis above to the threads below: these are the
              individual voices the shared picture is woven from. Rust --accent
              keeps this zone visually distinct from the green synthesis card. */}
          <div className="flex items-baseline gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[var(--accent)]">
            <span>The threads behind it</span>
            <span className="ml-auto text-muted-foreground/70">
              <span className="tabular-nums">{voiceCount}</span>{" "}
              {voiceCount === 1 ? "voice" : "voices"}
            </span>
          </div>
          <ol className="flex flex-col divide-y divide-border/70 border-y border-border/70">
            {(showAllThemes ? themes : themes.slice(0, 3)).map((t, i) => {
              const isExpanded = expandedThemeId === t.id;
              const themePoints = pointsByTheme.get(t.id) ?? [];
              const allPhrases = Array.from(
                new Set(themePoints.map((p) => p.surface_phrase)),
              );
              const phrases = allPhrases.slice(0, THEME_PHRASE_PREVIEW);
              const hiddenPhraseCount = allPhrases.length - phrases.length;
              const themeVoices = themeVoiceCounts.get(t.id) ?? 0;
              const canExpand = true;
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
                      <p className="font-sans text-[0.92rem] leading-[1.55] text-muted-foreground line-clamp-3">
                        {t.description}
                      </p>
                    </div>
                    <span className="flex flex-col items-end gap-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                      <span className="font-display text-[1.05rem] not-italic tabular-nums text-foreground/85">
                        {themeVoices}
                      </span>
                      <span>{themeVoices === 1 ? "voice" : "voices"}</span>
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
                        {hiddenPhraseCount > 0 && (
                          <Link
                            href={`/s/${sessionCode}/points?theme=${t.id}`}
                            className="mt-1 inline-flex items-center gap-1.5 self-start font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/85 hover:text-foreground"
                          >
                            <span>
                              See all {allPhrases.length} under this theme
                            </span>
                            <span aria-hidden>→</span>
                          </Link>
                        )}
                      </div>
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {themes.length > 3 && (
        <button
          type="button"
          onClick={() => {
            setShowAllThemes((prev) => !prev);
            // Collapse any drilldown when collapsing the list — otherwise
            // an expanded theme that's now hidden leaves stale state.
            if (showAllThemes) setExpandedThemeId(null);
          }}
          className="group/more -mt-1 inline-flex items-center gap-2 self-end rounded-full border border-border/70 bg-background/40 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-foreground/75 transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 hover:text-foreground"
          aria-expanded={showAllThemes}
        >
          <span>
            {showAllThemes
              ? "Show fewer themes"
              : `Show ${themes.length - 3} more theme${themes.length - 3 === 1 ? "" : "s"}`}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              showAllThemes ? "rotate-180" : "rotate-0",
            )}
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
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
          {themes.length} {themes.length === 1 ? "theme" : "themes"} ·{" "}
          <span className="tabular-nums">{voiceCount}</span>{" "}
          {voiceCount === 1 ? "voice" : "voices"} so far
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
