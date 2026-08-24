import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/participant";
import { createAdmin } from "@/lib/supabase/admin";
import { localized } from "@/lib/translate-session";

type SessionRow = {
  id: string;
  topic: string;
  topic_es: string | null;
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
  /** Topic resolved for the active locale — Spanish when we have it, else English. */
  title: string;
};

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const { user } = await getCurrentUser();
  const admin = createAdmin();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, topic, topic_es, status, created_at")
    .eq("status", "open")
    .is("archived_at", null)
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
    const title = localized(s.topic, s.topic_es, locale) ?? s.topic;
    if (finishedIds.has(s.id)) return { session: s, bucket: "finished", title };
    if (inProgressIds.has(s.id)) return { session: s, bucket: "in_progress", title };
    return { session: s, bucket: "not_started", title };
  });

  const finished = cards.filter((c) => c.bucket === "finished");
  const inProgress = cards.filter((c) => c.bucket === "in_progress");
  const notStarted = cards.filter((c) => c.bucket === "not_started");

  // Resolved here rather than inside StatusChip so the helper components stay
  // plain presentational functions.
  const actionLabels: Record<Bucket, string> = {
    finished: t("actionView"),
    in_progress: t("actionContinue"),
    not_started: t("actionBegin"),
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
      <section className="flex flex-col gap-5 pb-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("eyebrow")}
        </span>
        <h1
          className="font-display text-[2.4rem] italic leading-[1.05] tracking-[-0.015em] text-foreground sm:text-[2.9rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          {t("title")}
        </h1>
        <p className="font-sans text-[1.05rem] leading-[1.6] text-foreground/85">
          {t("lede")}
        </p>
      </section>

      <div className="flex flex-col gap-5 border-t border-border/60 pt-8 pb-2 font-sans text-[0.95rem] leading-[1.7] text-muted-foreground">
        <p>{t("aroundTheFire")}</p>
        <p>{t("steepedInContext")}</p>
        <p className="text-[0.875rem] italic text-muted-foreground/85">
          {t("workInProgress")}
        </p>
      </div>

      <div
        aria-hidden
        className="my-12 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <section className="flex flex-col gap-3 pb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("directoryEyebrow")}
        </span>
        <h2
          className="font-display text-[1.5rem] italic leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[1.75rem]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
        >
          {t("openConversations")}
        </h2>
        <p className="font-sans text-[0.95rem] leading-[1.55] text-muted-foreground">
          {hasPhone ? t("directoryWithPhone") : t("directoryWithoutPhone")}
        </p>
      </section>

      {!hasPhone && (
        <p className="mb-8 rounded-lg border border-dashed border-border/70 bg-card/40 px-4 py-3 font-sans text-[0.875rem] leading-[1.55] text-muted-foreground">
          {t("verifyPrompt")}
        </p>
      )}

      <div className="flex flex-col gap-10">
        {hasPhone && (
          <Section
            label={t("finished")}
            cards={finished}
            emptyText={t("finishedEmpty")}
            actionLabels={actionLabels}
          />
        )}
        {hasPhone && (
          <Section
            label={t("inProgress")}
            cards={inProgress}
            emptyText={t("inProgressEmpty")}
            actionLabels={actionLabels}
          />
        )}
        <Section
          label={t("notStarted")}
          cards={notStarted}
          emptyText={t("notStartedEmpty")}
          actionLabels={actionLabels}
        />
      </div>

      <footer className="mt-20 flex items-center justify-center gap-2 border-t border-border/40 pt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
        <span>{t("footer")}</span>
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
  actionLabels,
}: {
  label: string;
  cards: SessionCard[];
  emptyText: string;
  actionLabels: Record<Bucket, string>;
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
          {cards.map(({ session, bucket, title }) => (
            <li key={session.id}>
              <Link
                href={`/s/${session.id}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card px-4 py-4 transition-colors hover:border-foreground/40 hover:bg-accent/30"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-sans text-[1rem] font-medium leading-[1.4] text-foreground">
                    {title}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    /{session.id}
                  </span>
                </div>
                <StatusChip label={actionLabels[bucket]} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground">
      {label}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </span>
  );
}
