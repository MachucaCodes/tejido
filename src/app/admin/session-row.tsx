import Link from "next/link";

export type SessionListRow = {
  id: string;
  topic: string;
  status: string;
  created_at: string;
};

/** One session in an admin list. Archived rows are dimmed and say so. */
export function SessionRow({
  session: s,
  count,
  archived = false,
}: {
  session: SessionListRow;
  count: number;
  archived?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/admin/sessions/${s.id}`}
        className={`flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent ${
          archived ? "opacity-60" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="font-medium">{s.id}</p>
          <p className="truncate text-sm text-muted-foreground">{s.topic}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(s.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>
            {count} {count === 1 ? "voice" : "voices"}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5">
            {archived ? "archived" : s.status}
          </span>
        </div>
      </Link>
    </li>
  );
}
