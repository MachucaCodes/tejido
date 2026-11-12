import Link from "next/link";

import { formatDateTime } from "@/lib/format-date";

type Tab = "overview" | "synthesis" | "logs" | "settings";

/**
 * One header for every page about a session: topic as the title, code ·
 * status · date under it, and tabs between the session's pages with the
 * current one marked.
 */
export default function SessionHeader({
  session,
  current,
  isAdmin,
  actions,
}: {
  session: {
    id: string;
    topic: string | null;
    status: string;
    archived_at: string | null;
    created_at: string;
  };
  current: Tab;
  isAdmin: boolean;
  actions?: React.ReactNode;
}) {
  const base = `/admin/sessions/${session.id}`;
  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: base },
    { key: "synthesis", label: "Synthesis", href: `${base}/synthesis` },
    // Logs are admin-only, matching the logs page guard.
    ...(isAdmin ? [{ key: "logs" as const, label: "Logs", href: `${base}/logs` }] : []),
    { key: "settings", label: "Settings", href: `${base}/settings` },
  ];

  return (
    <header className="space-y-3">
      {/* Actions go under the title on a phone so the title keeps its width. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold">{session.topic || session.id}</h1>
          <p className="text-xs text-muted-foreground">
            {session.id} · {session.archived_at ? "archived" : session.status} ·{" "}
            {formatDateTime(session.created_at)}
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {session.archived_at && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Archived: not taking responses.
        </p>
      )}
      <nav className="flex gap-4 border-b border-border text-sm" aria-label="Session pages">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === current ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2 ${
              t.key === current
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
