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
    <main className="mx-auto w-full max-w-3xl px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Sessions
        </span>
        <p
          className="font-display text-[1.7rem] italic leading-[1.18] tracking-[-0.005em] text-foreground/90 sm:text-[2rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          Your directory
        </p>
        <p className="font-sans text-[0.98rem] leading-[1.55] text-muted-foreground">
          {hasPhone
            ? "Conversations you've completed, ones you've started, and ones still waiting for your voice."
            : "Conversations open to the community. Join one to see your history here."}
        </p>
      </header>

      {!hasPhone && (
        <p className="mt-6 rounded-lg border border-dashed border-border/70 bg-card/40 px-4 py-3 font-sans text-[0.9rem] leading-[1.55] text-muted-foreground">
          Verify your phone in any session to see what you&apos;ve finished and
          what you haven&apos;t started yet.
        </p>
      )}

      <Section
        label="Finished"
        caption="Already shared your voice"
        cards={finished}
        emptyText="Nothing finished yet."
        hide={!hasPhone}
      />
      <Section
        label="In progress"
        caption="Picked up but not yet shared"
        cards={inProgress}
        emptyText="Nothing in progress."
        hide={!hasPhone}
      />
      <Section
        label="Not started"
        caption="Open and waiting"
        cards={notStarted}
        emptyText="No open sessions right now."
      />
    </main>
  );
}

function Section({
  label,
  caption,
  cards,
  emptyText,
  hide,
}: {
  label: string;
  caption: string;
  cards: SessionCard[];
  emptyText: string;
  hide?: boolean;
}) {
  if (hide) return null;
  return (
    <section className="mt-10 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
          {cards.length} {cards.length === 1 ? "session" : "sessions"}
        </span>
      </div>
      <p className="font-sans text-[0.9rem] leading-[1.5] text-muted-foreground/80">
        {caption}
      </p>
      {cards.length === 0 ? (
        <p className="font-display text-[1rem] italic leading-relaxed text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/70 border-t border-border/70">
          {cards.map(({ session, bucket }) => (
            <li key={session.id}>
              <Link
                href={`/s/${session.id}`}
                className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 transition-colors hover:bg-accent/30"
              >
                <div className="flex flex-col gap-1.5">
                  <p
                    className="font-display text-[1.25rem] leading-[1.3] text-foreground sm:text-[1.35rem]"
                    style={{
                      fontVariationSettings: '"opsz" 24, "SOFT" 60',
                    }}
                  >
                    {session.topic}
                  </p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                    {session.id}
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground transition-colors group-hover:text-foreground">
                  {bucket === "finished"
                    ? "View →"
                    : bucket === "in_progress"
                      ? "Continue →"
                      : "Begin →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
