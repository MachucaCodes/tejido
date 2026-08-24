import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/participant";
import { createAdmin } from "@/lib/supabase/admin";
import { localized } from "@/lib/translate-session";

import { LogoutButton } from "./logout-button";

type SessionEmbed = {
  id: string;
  topic: string;
  topic_es: string | null;
  status: string;
};
type ParticipantRow = {
  id: string;
  session_id: string;
  phase: "in_conversation" | "complete";
  created_at: string;
  completed_at: string | null;
  sessions: SessionEmbed | SessionEmbed[] | null;
};

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const locale = await getLocale();
  const { user } = await getCurrentUser();
  if (!user) redirect("/");

  const admin = createAdmin();

  const { data: profile } = await admin
    .from("users")
    .select("full_name, lot_number")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rows } = await admin
    .from("participants")
    .select(
      "id, session_id, phase, created_at, completed_at, sessions(id, topic, topic_es, status)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const participants = (rows ?? []) as ParticipantRow[];

  // One round-trip for message counts across all of this user's participants,
  // so the list can show which conversations actually got going.
  const ids = participants.map((p) => p.id);
  const turnCounts = new Map<string, number>();
  if (ids.length) {
    const { data: turns } = await admin
      .from("transcript_turns")
      .select("participant_id")
      .in("participant_id", ids)
      .eq("role", "user");
    for (const t of (turns ?? []) as { participant_id: string }[]) {
      turnCounts.set(t.participant_id, (turnCounts.get(t.participant_id) ?? 0) + 1);
    }
  }

  const fullName = profile?.full_name?.trim() || null;
  const lotNumber = profile?.lot_number?.trim() || null;
  const isGuest = user.is_anonymous;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
            <span aria-hidden>¶ </span>
            {t("eyebrow")}
          </p>
          <h1
            className="font-display text-[clamp(1.9rem,5vw,2.8rem)] leading-[1.05] tracking-[-0.012em] text-foreground"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 0' }}
          >
            {fullName ?? t("fallbackName")}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {lotNumber ? t("lot", { number: lotNumber }) : t("noLot")}
            {user.phone ? ` · +${user.phone}` : isGuest ? ` · ${t("guest")}` : ""}
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-10 sm:mt-12">
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
            {t("yourConversations")}
          </h2>
          <span className="h-px flex-1 bg-border/70" aria-hidden />
        </div>

        {participants.length === 0 ? (
          <p className="mt-6 font-display text-[1.05rem] italic leading-relaxed text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {participants.map((p) => {
              const session = Array.isArray(p.sessions) ? p.sessions[0] : p.sessions;
              if (!session) return null;
              const done = p.phase === "complete" || Boolean(p.completed_at);
              const msgs = turnCounts.get(p.id) ?? 0;
              return (
                <li key={p.id}>
                  <Link
                    href={`/s/${encodeURIComponent(session.id)}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm transition-colors hover:border-[var(--accent)]/50"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className="truncate font-display text-[1.15rem] italic leading-tight text-foreground">
                        {localized(session.topic, session.topic_es, locale) ??
                          session.topic}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {fmtDate(p.created_at, locale)} ·{" "}
                        {msgs > 0 ? t("messageCount", { count: msgs }) : t("notStarted")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          done
                            ? "rounded-full bg-[var(--accent)]/12 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.2em] text-[var(--accent)]"
                            : "rounded-full bg-foreground/[0.06] px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.2em] text-muted-foreground"
                        }
                      >
                        {done ? t("completed") : t("inProgress")}
                      </span>
                      <span
                        className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
