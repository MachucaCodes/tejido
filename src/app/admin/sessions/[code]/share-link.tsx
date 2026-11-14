"use client";

import { CheckCircle2Icon } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import CopyJoinLink from "./copy-join-link";

const noop = () => () => {};

/**
 * The join link as text an admin can read, check and select, with the copy
 * button beside it. Leads the overview until the first voice comes in.
 */
export default function ShareLink({
  code,
  created,
  activity,
}: {
  code: string;
  created: boolean;
  activity: string | null;
}) {
  // Same origin the copy button uses; the server render shows the path alone.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const linkRef = useRef<HTMLSpanElement>(null);

  // "Session created" is for the moment after Create: drop the ?created=1 so a
  // reload or a shared URL doesn't say it again.
  useEffect(() => {
    if (!created) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [created]);

  // If the clipboard refuses, select the link so Ctrl/Cmd-C takes it.
  const selectLink = () => {
    const el = linkRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-label="Join link">
      {created && (
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <CheckCircle2Icon className="size-4 text-primary" aria-hidden />
          Session created. It’s open and listed on the home page.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span
          ref={linkRef}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm break-all select-all"
        >
          {origin}/s/{code}
        </span>
        <CopyJoinLink code={code} prominent onFail={selectLink} />
      </div>
      {activity && <p className="text-xs text-muted-foreground">{activity}</p>}
    </section>
  );
}
