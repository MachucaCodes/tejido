import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import RebuildButton from "./rebuild-button";

type PointRow = {
  id: string;
  participant_id: string;
  surface_phrase: string | null;
  created_at: string;
};

type Summary = { text: string; at: string };

// One person's answers inside a gap between two summaries.
type VoiceGroup = { participantId: string; phrases: string[] };

function groupByVoice(points: PointRow[]): VoiceGroup[] {
  const groups = new Map<string, VoiceGroup>();
  for (const p of points) {
    const phrase = (p.surface_phrase ?? "").trim();
    if (!phrase) continue;
    let g = groups.get(p.participant_id);
    if (!g) {
      g = { participantId: p.participant_id, phrases: [] };
      groups.set(p.participant_id, g);
    }
    g.phrases.push(phrase);
  }
  return [...groups.values()];
}

function fmt(at: string) {
  return new Date(at).toLocaleString();
}

export default async function SynthesisHistoryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");
  const { code } = await params;
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("id, topic, created_by, summary_text, summary_generated_at")
    .eq("id", code)
    .single();
  if (!session) notFound();
  if (!guard.isAdmin && session.created_by !== guard.user.id) notFound();

  // Every summary ever generated lives in the LLM call log; the session row
  // only keeps the latest one.
  const [{ data: logRows }, { data: pointRows }] = await Promise.all([
    admin
      .from("llm_call_logs")
      .select("created_at, parsed_output")
      .eq("session_id", code)
      .eq("call_kind", "summarize_session")
      .eq("status", "success")
      .order("created_at", { ascending: true }),
    admin
      .from("extracted_points")
      .select(
        "id, participant_id, surface_phrase, created_at, participants!inner(session_id)",
      )
      .eq("participants.session_id", code)
      .order("created_at", { ascending: true })
      .range(0, 9999),
  ]);

  const summaries: Summary[] = (logRows ?? [])
    .map((r) => ({
      text: (
        (r.parsed_output as { summary?: string } | null)?.summary ?? ""
      ).trim(),
      at: r.created_at as string,
    }))
    .filter((s) => s.text);
  // Sessions summarized before logging existed still have their current one.
  if (
    summaries.length === 0 &&
    session.summary_text &&
    session.summary_generated_at
  ) {
    summaries.push({
      text: session.summary_text,
      at: session.summary_generated_at,
    });
  }

  const points = (pointRows ?? []).filter(
    (p) => p.participant_id,
  ) as PointRow[];

  // Anonymous on purpose — "Voice N" in the order people first contributed,
  // never their names.
  const labelByParticipant = new Map<string, string>();
  for (const p of points) {
    if (labelByParticipant.has(p.participant_id)) continue;
    labelByParticipant.set(
      p.participant_id,
      `Voice ${labelByParticipant.size + 1}`,
    );
  }

  // Split the points into gaps: the answers before summary 1, between
  // summary 1 and 2, … and those after the latest summary.
  const gaps: PointRow[][] = summaries.map(() => []);
  const pending: PointRow[] = [];
  for (const p of points) {
    const t = Date.parse(p.created_at);
    const i = summaries.findIndex((s) => t <= Date.parse(s.at));
    if (i === -1) pending.push(p);
    else gaps[i].push(p);
  }

  // Voices each summary had to work with, counted cumulatively.
  const seen = new Set<string>();
  const voicesAt = gaps.map((g) => {
    for (const p of g) seen.add(p.participant_id);
    return seen.size;
  });
  const pendingVoices = groupByVoice(pending);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={`/admin/sessions/${session.id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {session.id}
        </Link>
        <h1 className="text-lg font-semibold">Synthesis history</h1>
        <p className="text-sm text-muted-foreground">
          Each summary, newest first, with the answers that came in just before
          it.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">Not in the summary yet</h2>
            <p className="text-xs text-muted-foreground">
              {pending.length === 0
                ? "The latest summary includes every answer so far."
                : `${pendingVoices.length} ${pendingVoices.length === 1 ? "voice" : "voices"}, ${pending.length} ${pending.length === 1 ? "point" : "points"} since ${summaries.length ? fmt(summaries[summaries.length - 1].at) : "the start"}.`}
            </p>
          </div>
          <RebuildButton code={session.id} />
        </div>
        <VoiceList groups={pendingVoices} labels={labelByParticipant} />
      </section>

      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No summaries yet.</p>
      ) : (
        <ol className="space-y-6">
          {summaries
            .map((s, i) => ({ s, i }))
            .reverse()
            .map(({ s, i }) => {
              const groups = groupByVoice(gaps[i]);
              return (
                <li key={s.at} className="space-y-3">
                  <article className="space-y-2 rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-sm font-medium">
                        Summary {i + 1}
                        {i === summaries.length - 1 && (
                          <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs font-normal">
                            current
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {fmt(s.at)} · {voicesAt[i]}{" "}
                        {voicesAt[i] === 1 ? "voice" : "voices"}
                      </p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {s.text}
                    </p>
                  </article>
                  <div className="space-y-2 border-l-2 border-border pl-4">
                    <p className="text-xs text-muted-foreground">
                      {groups.length === 0
                        ? i === 0
                          ? "No answers before this summary."
                          : "No new answers since the summary before — rebuilt from the same voices."
                        : `${groups.length} ${groups.length === 1 ? "voice" : "voices"} came in ${i === 0 ? "before this summary" : `between summary ${i} and ${i + 1}`}:`}
                    </p>
                    <VoiceList groups={groups} labels={labelByParticipant} />
                  </div>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}

function VoiceList({
  groups,
  labels,
}: {
  groups: VoiceGroup[];
  labels: Map<string, string>;
}) {
  if (groups.length === 0) return null;
  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.participantId} className="text-sm">
          <p className="text-xs font-medium text-muted-foreground">
            {labels.get(g.participantId)}
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {g.phrases.map((phrase, j) => (
              <li key={j}>{phrase}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
