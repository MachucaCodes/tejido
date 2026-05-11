import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

type PointRow = {
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

type AssignmentRow = {
  point_id: string;
  theme_id: string;
};

type TurnRow = {
  id: string;
  participant_id: string;
  role: "user" | "assistant";
  content: string;
  ord: number;
};

export default async function SessionPointsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const admin = createAdmin();
  const guard = await requireAdmin();
  const isAdmin = guard.ok;

  const { data: session } = await admin
    .from("sessions")
    .select("id, topic")
    .eq("id", code)
    .single();
  if (!session) notFound();

  const [pointsRes, themesRes, assignmentsRes, turnsRes] = await Promise.all([
    admin
      .from("extracted_points")
      .select(
        "id, participant_id, idx, surface_phrase, want, context, rationale, doubts, created_at, participants!inner(session_id)",
      )
      .eq("participants.session_id", code)
      .order("created_at", { ascending: true })
      .order("idx", { ascending: true }),
    admin
      .from("themes")
      .select("id, short_name")
      .eq("session_id", code),
    admin
      .from("theme_assignments")
      .select("point_id, theme_id, themes!inner(session_id)")
      .eq("themes.session_id", code),
    isAdmin
      ? admin
          .from("transcript_turns")
          .select(
            "id, participant_id, role, content, ord, participants!inner(session_id)",
          )
          .eq("participants.session_id", code)
          .order("ord", { ascending: true })
      : Promise.resolve({ data: [] as TurnRow[] }),
  ]);

  const points = (pointsRes.data ?? []) as PointRow[];
  const themesById = new Map(
    (themesRes.data ?? []).map((t) => [t.id, t.short_name]),
  );
  const themesByPoint = new Map<string, string[]>();
  for (const a of (assignmentsRes.data ?? []) as AssignmentRow[]) {
    const name = themesById.get(a.theme_id);
    if (!name) continue;
    const arr = themesByPoint.get(a.point_id);
    if (arr) arr.push(name);
    else themesByPoint.set(a.point_id, [name]);
  }

  const grouped = new Map<string, PointRow[]>();
  for (const p of points) {
    const arr = grouped.get(p.participant_id);
    if (arr) arr.push(p);
    else grouped.set(p.participant_id, [p]);
  }
  const participantIds = Array.from(grouped.keys());

  const turnsByParticipant = new Map<string, TurnRow[]>();
  for (const t of (turnsRes.data ?? []) as TurnRow[]) {
    const arr = turnsByParticipant.get(t.participant_id);
    if (arr) arr.push(t);
    else turnsByParticipant.set(t.participant_id, [t]);
  }

  const voiceCount = participantIds.length;
  const pointCount = points.length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/s/${code}`}
            className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground"
          >
            ← {code}
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/80">
            {voiceCount} {voiceCount === 1 ? "voice" : "voices"} ·{" "}
            {pointCount} {pointCount === 1 ? "point" : "points"}
          </span>
        </div>
        <p
          className="font-display text-[1.7rem] italic leading-[1.18] tracking-[-0.005em] text-foreground/90 sm:text-[2rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          Every point, every voice
        </p>
        {session.topic && (
          <p className="font-sans text-[0.98rem] leading-[1.55] text-muted-foreground">
            {session.topic}
          </p>
        )}
      </header>

      {pointCount === 0 ? (
        <p className="mt-10 font-display text-[1.05rem] italic leading-relaxed text-muted-foreground">
          No points have been extracted for this session yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/70">
          {participantIds.map((participantId, pi) => {
            const participantPoints = grouped.get(participantId) ?? [];
            const participantTurns = turnsByParticipant.get(participantId) ?? [];
            return (
              <section
                key={participantId}
                className="flex flex-col gap-5 py-8"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">
                    Voice {String(pi + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
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
                  {participantPoints.map((p) => {
                    const themes = themesByPoint.get(p.id) ?? [];
                    const doubts = (p.doubts ?? []).filter((d) =>
                      d?.trim?.(),
                    );
                    return (
                      <li
                        key={p.id}
                        className="grid grid-cols-[2.5rem_1fr] gap-4"
                      >
                        <span className="pt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 tabular-nums">
                          {String(p.idx + 1).padStart(2, "0")}
                        </span>
                        <article className="flex flex-col gap-3">
                          <p
                            className="font-display text-[1.15rem] leading-[1.35] text-foreground sm:text-[1.2rem]"
                            style={{
                              fontVariationSettings: '"opsz" 24, "SOFT" 60',
                            }}
                          >
                            “{p.surface_phrase}”
                          </p>
                          {themes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {themes.map((name, i) => (
                                <span
                                  key={`${p.id}-theme-${i}`}
                                  className="rounded-full border border-border/70 bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                          <PointField label="Want" value={p.want} />
                          <PointField label="Context" value={p.context} />
                          <PointField label="Rationale" value={p.rationale} />
                          {doubts.length > 0 && (
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                                Doubts
                              </span>
                              <ul className="flex flex-col gap-1 pl-3">
                                {doubts.map((d, i) => (
                                  <li
                                    key={`${p.id}-doubt-${i}`}
                                    className="relative font-sans text-[0.95rem] leading-[1.55] text-foreground/85 before:absolute before:-left-3 before:top-[0.7em] before:size-1 before:rounded-full before:bg-muted-foreground/50"
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
                  })}
                </ol>
                {isAdmin && participantTurns.length > 0 && (
                  <details className="group/transcript rounded-lg border border-border/70 bg-card/40">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
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
                          <span className="pt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                            {t.role}
                          </span>
                          <p className="whitespace-pre-wrap font-sans text-[0.92rem] leading-[1.55] text-foreground/85">
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
      )}
    </main>
  );
}

function PointField({ label, value }: { label: string; value: string }) {
  const trimmed = value?.trim?.() ?? "";
  if (!trimmed) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
        {label}
      </span>
      <p className="font-sans text-[0.95rem] leading-[1.55] text-foreground/85">
        {trimmed}
      </p>
    </div>
  );
}
