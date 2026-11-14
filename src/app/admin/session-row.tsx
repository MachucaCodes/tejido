import Link from "next/link";
import { formatDateTime } from "@/lib/format-date";

export type SessionListRow = {
  id: string;
  topic: string;
  status: string;
  created_at: string;
};

/**
 * One session in an admin list. Archived rows say so with a tag and a muted
 * title; the row itself is not faded, so its second line stays readable.
 */
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
        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
      >
        {/* Same as SessionHeader: topic as the title, code · date under it.
            The code keeps two sessions with the same topic apart. */}
        <div className="min-w-0">
          <p className={`truncate font-medium ${archived ? "text-muted-foreground" : ""}`}>
            {s.topic || s.id}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {s.id} · {formatDateTime(s.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>
            {count} {count === 1 ? "voice" : "voices"}
          </span>
          {/* "open" is the usual case; only flag the others. */}
          {(archived || s.status !== "open") && (
            <span className="rounded bg-secondary px-2 py-0.5">
              {archived ? "archived" : s.status}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
