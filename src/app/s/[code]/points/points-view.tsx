"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type PointRow = {
  id: string;
  participant_id: string;
  idx: number;
  surface_phrase: string;
  want: string;
  context: string;
  rationale: string;
  doubts: string[] | null;
  created_at: string;
};

export type TurnRow = {
  id: string;
  participant_id: string;
  role: "user" | "assistant";
  content: string;
  ord: number;
};

export type ThemeRow = { id: string; short_name: string };
export type AssignmentRow = { point_id: string; theme_id: string };

type ViewMode = "voice" | "theme";

export function PointsView({
  code,
  topic,
  points,
  voices,
  themes,
  assignments,
  turns,
  isAdmin,
  initialThemeId = null,
}: {
  code: string;
  topic: string | null;
  points: PointRow[];
  voices: string[];
  themes: ThemeRow[];
  assignments: AssignmentRow[];
  turns: TurnRow[];
  isAdmin: boolean;
  initialThemeId?: string | null;
}) {
  const initialThemeValid =
    initialThemeId && themes.some((t) => t.id === initialThemeId)
      ? initialThemeId
      : null;
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(
    initialThemeValid,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialThemeValid ? "theme" : "voice",
  );
  const [showAllChips, setShowAllChips] = useState(false);

  const themeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of themes) m.set(t.id, t.short_name);
    return m;
  }, [themes]);

  const themeIdsByPoint = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of assignments) {
      const arr = m.get(a.point_id);
      if (arr) arr.push(a.theme_id);
      else m.set(a.point_id, [a.theme_id]);
    }
    return m;
  }, [assignments]);

  const pointCountByTheme = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      m.set(a.theme_id, (m.get(a.theme_id) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

  const voiceIndexById = useMemo(() => {
    const m = new Map<string, number>();
    voices.forEach((id, i) => m.set(id, i));
    return m;
  }, [voices]);

  const filteredPoints = useMemo(() => {
    if (!selectedThemeId) return points;
    return points.filter((p) =>
      (themeIdsByPoint.get(p.id) ?? []).includes(selectedThemeId),
    );
  }, [points, selectedThemeId, themeIdsByPoint]);

  const pointsByVoice = useMemo(() => {
    const m = new Map<string, PointRow[]>();
    for (const p of filteredPoints) {
      const arr = m.get(p.participant_id);
      if (arr) arr.push(p);
      else m.set(p.participant_id, [p]);
    }
    return m;
  }, [filteredPoints]);

  const pointsByTheme = useMemo(() => {
    const m = new Map<string, PointRow[]>();
    for (const p of filteredPoints) {
      const ids = themeIdsByPoint.get(p.id) ?? [];
      if (ids.length === 0) {
        const arr = m.get("__untagged__");
        if (arr) arr.push(p);
        else m.set("__untagged__", [p]);
      } else {
        for (const id of ids) {
          const arr = m.get(id);
          if (arr) arr.push(p);
          else m.set(id, [p]);
        }
      }
    }
    return m;
  }, [filteredPoints, themeIdsByPoint]);

  const turnsByParticipant = useMemo(() => {
    const m = new Map<string, TurnRow[]>();
    for (const t of turns) {
      const arr = m.get(t.participant_id);
      if (arr) arr.push(t);
      else m.set(t.participant_id, [t]);
    }
    return m;
  }, [turns]);

  const visibleVoices = voices.filter(
    (id) => (pointsByVoice.get(id) ?? []).length > 0,
  );
  const visibleThemes = themes.filter(
    (t) => (pointsByTheme.get(t.id) ?? []).length > 0,
  );
  const untaggedPoints = pointsByTheme.get("__untagged__") ?? [];

  const filterActive = selectedThemeId !== null;
  const filteredPointCount = filteredPoints.length;
  const totalPointCount = points.length;
  const totalVoiceCount = voices.length;
  const selectedThemeName = selectedThemeId
    ? themeNameById.get(selectedThemeId)
    : null;

  const toggleTheme = (id: string) =>
    setSelectedThemeId((prev) => (prev === id ? null : id));

  const CHIP_LIMIT = 6;
  const chipsCollapsed = !showAllChips && themes.length > CHIP_LIMIT;
  const chipThemes = chipsCollapsed
    ? (() => {
        const head = themes.slice(0, CHIP_LIMIT);
        if (
          selectedThemeId &&
          !head.some((t) => t.id === selectedThemeId)
        ) {
          const sel = themes.find((t) => t.id === selectedThemeId);
          if (sel) return [...head, sel];
        }
        return head;
      })()
    : themes;
  const hiddenChipCount = themes.length - chipThemes.length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/s/${code}`}
            className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            ← {code}
          </Link>
          <span className="font-mono text-[11px] text-muted-foreground">
            {filterActive ? (
              <>
                {filteredPointCount} of {totalPointCount} points
              </>
            ) : (
              <>
                {totalVoiceCount}{" "}
                {totalVoiceCount === 1 ? "voice" : "voices"} ·{" "}
                {totalPointCount}{" "}
                {totalPointCount === 1 ? "point" : "points"}
              </>
            )}
          </span>
        </div>
        <p
          className="font-display text-[1.7rem] italic leading-[1.18] tracking-[-0.005em] text-foreground/90 sm:text-[2rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          Every point, every voice
        </p>
        {topic && (
          <p className="font-sans text-[1rem] leading-[1.55] text-muted-foreground">
            {topic}
          </p>
        )}
      </header>

      {themes.length > 0 && (
        <div className="flex flex-col gap-3 border-b border-border/70 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[12px] font-medium text-muted-foreground">
              {filterActive && selectedThemeName
                ? `Filtered: ${selectedThemeName}`
                : "Filter by theme"}
            </span>
            <div className="flex items-center gap-3">
              {filterActive && (
                <button
                  type="button"
                  onClick={() => setSelectedThemeId(null)}
                  className="font-sans text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <div className="flex rounded-md border border-border/70 bg-card p-0.5 font-sans text-[12px]">
                <button
                  type="button"
                  onClick={() => setViewMode("voice")}
                  aria-pressed={viewMode === "voice"}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    viewMode === "voice"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  By voice
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("theme")}
                  aria-pressed={viewMode === "theme"}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    viewMode === "theme"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  By theme
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chipThemes.map((t) => {
              const active = selectedThemeId === t.id;
              const count = pointCountByTheme.get(t.id) ?? 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTheme(t.id)}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.short_name}
                  <span
                    className={`ml-1.5 ${active ? "opacity-70" : "opacity-50"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {themes.length > CHIP_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllChips((v) => !v)}
                className="rounded-full border border-dashed border-border/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                {chipsCollapsed ? `+ ${hiddenChipCount} more` : "Show fewer"}
              </button>
            )}
          </div>
        </div>
      )}

      {filteredPointCount === 0 ? (
        <p className="mt-10 font-display text-[1.05rem] italic leading-relaxed text-muted-foreground">
          {filterActive
            ? "No points match the selected theme."
            : "No points have been extracted for this session yet."}
        </p>
      ) : viewMode === "voice" ? (
        <div className="flex flex-col divide-y divide-border/70">
          {visibleVoices.map((participantId) => {
            const voiceIdx = voiceIndexById.get(participantId) ?? 0;
            const participantPoints = pointsByVoice.get(participantId) ?? [];
            const participantTurns =
              turnsByParticipant.get(participantId) ?? [];
            return (
              <section
                key={participantId}
                className="flex flex-col gap-5 py-8"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[12px] text-foreground/80">
                    Voice {String(voiceIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {participantPoints.length}{" "}
                    {participantPoints.length === 1 ? "point" : "points"}
                    {isAdmin && participantTurns.length > 0 && (
                      <>
                        {" · "}
                        {participantTurns.length}{" "}
                        {participantTurns.length === 1 ? "turn" : "turns"}
                      </>
                    )}
                  </span>
                </div>
                <ol className="flex flex-col gap-6">
                  {participantPoints.map((p) => (
                    <PointItem
                      key={p.id}
                      point={p}
                      gutter={
                        <span className="pt-1 font-mono text-[12px] text-muted-foreground tabular-nums">
                          {String(p.idx + 1).padStart(2, "0")}
                        </span>
                      }
                      chipThemeIds={themeIdsByPoint.get(p.id) ?? []}
                      themeNameById={themeNameById}
                    />
                  ))}
                </ol>
                {isAdmin && participantTurns.length > 0 && (
                  <details className="group/transcript rounded-lg border border-border/70 bg-card/40">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-sans text-[13px] font-medium text-muted-foreground hover:text-foreground">
                      <span>Transcript</span>
                      <span
                        className="transition-transform group-open/transcript:rotate-90"
                        aria-hidden
                      >
                        ›
                      </span>
                    </summary>
                    <ol className="flex flex-col gap-3 border-t border-border/70 px-4 py-4">
                      {participantTurns.map((t) => (
                        <li
                          key={t.id}
                          className="grid grid-cols-[4rem_1fr] gap-3"
                        >
                          <span className="pt-0.5 font-mono text-[11px] text-muted-foreground">
                            {t.role}
                          </span>
                          <p className="whitespace-pre-wrap font-sans text-[0.95rem] leading-[1.55] text-foreground">
                            {t.content}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/70">
          {visibleThemes.map((t) => {
            const themePoints = pointsByTheme.get(t.id) ?? [];
            return (
              <section key={t.id} className="flex flex-col gap-5 py-8">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-sans text-[1.05rem] font-medium text-foreground">
                    {t.short_name}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {themePoints.length}{" "}
                    {themePoints.length === 1 ? "point" : "points"}
                  </span>
                </div>
                <ol className="flex flex-col gap-6">
                  {themePoints.map((p) => {
                    const voiceIdx =
                      voiceIndexById.get(p.participant_id) ?? 0;
                    const otherThemeIds = (
                      themeIdsByPoint.get(p.id) ?? []
                    ).filter((id) => id !== t.id);
                    return (
                      <PointItem
                        key={`${t.id}-${p.id}`}
                        point={p}
                        gutter={
                          <span className="pt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                            V{String(voiceIdx + 1).padStart(2, "0")}
                          </span>
                        }
                        chipThemeIds={otherThemeIds}
                        themeNameById={themeNameById}
                      />
                    );
                  })}
                </ol>
              </section>
            );
          })}
          {untaggedPoints.length > 0 && (
            <section className="flex flex-col gap-5 py-8">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-sans text-[1.05rem] font-medium text-muted-foreground">
                  Untagged
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {untaggedPoints.length}{" "}
                  {untaggedPoints.length === 1 ? "point" : "points"}
                </span>
              </div>
              <ol className="flex flex-col gap-6">
                {untaggedPoints.map((p) => {
                  const voiceIdx =
                    voiceIndexById.get(p.participant_id) ?? 0;
                  return (
                    <PointItem
                      key={`untagged-${p.id}`}
                      point={p}
                      gutter={
                        <span className="pt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                          V{String(voiceIdx + 1).padStart(2, "0")}
                        </span>
                      }
                      chipThemeIds={[]}
                      themeNameById={themeNameById}
                    />
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function PointItem({
  point,
  gutter,
  chipThemeIds,
  themeNameById,
}: {
  point: PointRow;
  gutter: React.ReactNode;
  chipThemeIds: string[];
  themeNameById: Map<string, string>;
}) {
  const doubts = (point.doubts ?? []).filter((d) => d?.trim?.());
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-4">
      {gutter}
      <article className="flex flex-col gap-3">
        <p className="font-sans text-[1.1rem] leading-[1.45] text-foreground">
          “{point.surface_phrase}”
        </p>
        {chipThemeIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chipThemeIds.map((id, i) => {
              const name = themeNameById.get(id);
              if (!name) return null;
              return (
                <span
                  key={`${point.id}-chip-${i}`}
                  className="rounded-full border border-border/70 bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {name}
                </span>
              );
            })}
          </div>
        )}
        <PointField label="Want" value={point.want} />
        <PointField label="Context" value={point.context} />
        <PointField label="Rationale" value={point.rationale} />
        {doubts.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-sans text-[12px] font-medium text-muted-foreground">
              Doubts
            </span>
            <ul className="flex flex-col gap-1 pl-3">
              {doubts.map((d, i) => (
                <li
                  key={`${point.id}-doubt-${i}`}
                  className="relative font-sans text-[1rem] leading-[1.55] text-foreground before:absolute before:-left-3 before:top-[0.7em] before:size-1 before:rounded-full before:bg-muted-foreground/50"
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </li>
  );
}

function PointField({ label, value }: { label: string; value: string }) {
  const trimmed = value?.trim?.() ?? "";
  if (!trimmed) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[12px] font-medium text-muted-foreground">
        {label}
      </span>
      <p className="font-sans text-[1rem] leading-[1.55] text-foreground">
        {trimmed}
      </p>
    </div>
  );
}
