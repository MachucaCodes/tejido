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

export default async function SessionsDirectoryPage() {
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
      <header className="flex flex-col gap-3 pb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Sessions
        </span>
        <h1
          className="font-display text-[2rem] italic leading-[1.1] tracking-[-0.01em] text-foreground sm:text-[2.4rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          Your directory
        </h1>
        <p className="font-sans text-[0.95rem] leading-[1.55] text-muted-foreground">
          {hasPhone
            ? "Conversations you've completed, started, and ones still waiting for your voice."
            : "Open conversations across the community. Join one to start tracking your history here."}
        </p>
      </header>

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
