import Link from "next/link";

import { getCurrentUser } from "@/lib/participant";
import { createAdmin } from "@/lib/supabase/admin";

type SessionRow = {
  id: string;
  topic: string;
  status: "open" | "closed";
  created_at: string;
};

type ParticipantRow = {
  id: string;
  session_id: string;
};

type Bucket = "finished" | "in_progress" | "not_started";

type SessionCard = {
  session: SessionRow;
  bucket: Bucket;
};

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const { user } = await getCurrentUser();
  const admin = createAdmin();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, topic, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const allSessions = (sessions ?? []) as SessionRow[];
  const hasPhone = Boolean(user?.phone);

  const finishedIds = new Set<string>();
  const inProgressIds = new Set<string>();

  if (user) {
    const { data: parts } = await admin
      .from("participants")
      .select("id, session_id")
      .eq("user_id", user.id);
    const participantRows = (parts ?? []) as ParticipantRow[];

    if (participantRows.length > 0) {
      const participantIds = participantRows.map((p) => p.id);
      const { data: pointRows } = await admin
        .from("extracted_points")
        .select("participant_id")
        .in("participant_id", participantIds);

      const participantsWithPoints = new Set(
        (pointRows ?? []).map((r) => r.participant_id as string),
      );

      for (const p of participantRows) {
        if (participantsWithPoints.has(p.id)) finishedIds.add(p.session_id);
        else inProgressIds.add(p.session_id);
      }
    }
  }

  const cards: SessionCard[] = allSessions.map((s) => {
    if (finishedIds.has(s.id)) return { session: s, bucket: "finished" };
    if (inProgressIds.has(s.id)) return { session: s, bucket: "in_progress" };
    return { session: s, bucket: "not_started" };
  });

  const finished = cards.filter((c) => c.bucket === "finished");
  const inProgress = cards.filter((c) => c.bucket === "in_progress");
  const notStarted = cards.filter((c) => c.bucket === "not_started");

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
      <section className="flex flex-col gap-5 pb-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Community Sense-Making
        </span>
        <h1
          className="font-display text-[2.4rem] italic leading-[1.05] tracking-[-0.015em] text-foreground sm:text-[2.9rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          Gather around the fire.
        </h1>
        <p className="font-sans text-[1.05rem] leading-[1.6] text-foreground/85">
          A way to collect perspectives from the community and reflect them back
          in a coherent way — to help make sense of complex issues and questions
          together.
        </p>
      </section>

      <div className="flex flex-col gap-5 border-t border-border/60 pt-8 pb-2 font-sans text-[0.95rem] leading-[1.7] text-muted-foreground">
        <p>
          For much of human history, we would gather around the fire and
          have long discussions to help make sense of things and integrate
          perspectives. This is a way to asynchronously gather around the
          fire — to collect nuanced opinions, ideas, and concerns around a
          given topic, and give a shape to the collective intelligence of the
          community.
        </p>
        <p>
          You can have a conversation with an AI that has been steeped in our
          specific context at ESM — everything from our culture documents, to
          bylaws, to call transcripts from many of the calls we&apos;ve had
          over the years. Through a fluid conversation it will gather your
          unique insights, and weave a nuanced overview so that everyone can
          better understand the prevailing opinions as well as voices from the
          edges.
        </p>
        <p className="text-[0.875rem] italic text-muted-foreground/85">
          A work in progress that we&apos;re still building — feedback is
          encouraged and patience is appreciated.
        </p>
      </div>

      <div
        aria-hidden
        className="my-12 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <section className="flex flex-col gap-3 pb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          The Directory
        </span>
        <h2
          className="font-display text-[1.5rem] italic leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[1.75rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          Open conversations
        </h2>
        <p className="font-sans text-[0.95rem] leading-[1.55] text-muted-foreground">
          {hasPhone
            ? "Conversations you've completed, started, and ones still waiting for your voice."
            : "Join one to start tracking your history here."}
        </p>
      </section>

      {!hasPhone && (
        <p className="mb-8 rounded-lg border border-dashed border-border/70 bg-card/40 px-4 py-3 font-sans text-[0.875rem] leading-[1.55] text-muted-foreground">
          Verify your phone in any session to see what you&apos;ve finished and
          what you haven&apos;t started yet.
        </p>
      )}

      <div className="flex flex-col gap-10">
        {hasPhone && (
          <Section label="Finished" cards={finished} emptyText="Nothing finished yet." />
        )}
        {hasPhone && (
          <Section
            label="In progress"
            cards={inProgress}
            emptyText="Nothing in progress."
          />
        )}
        <Section
          label="Not started"
          cards={notStarted}
          emptyText="No open sessions right now."
        />
      </div>

      <footer className="mt-20 flex items-center justify-center gap-2 border-t border-border/40 pt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
        <span>Made by neighbors for neighbors</span>
        <span aria-hidden className="text-accent">
          ♥
        </span>
      </footer>
    </main>
  );
}

function Section({
  label,
  cards,
  emptyText,
}: {
  label: string;
  cards: SessionCard[];
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
          {cards.length}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="font-sans text-[0.9rem] leading-[1.55] text-muted-foreground/70">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map(({ session, bucket }) => (
            <li key={session.id}>
              <Link
                href={`/s/${session.id}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card px-4 py-4 transition-colors hover:border-foreground/40 hover:bg-accent/30"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-sans text-[1rem] font-medium leading-[1.4] text-foreground">
                    {session.topic}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    /{session.id}
                  </span>
                </div>
                <StatusChip bucket={bucket} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusChip({ bucket }: { bucket: Bucket }) {
  const label =
    bucket === "finished"
      ? "View"
      : bucket === "in_progress"
        ? "Continue"
        : "Begin";
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground">
      {label}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </span>
  );
}
