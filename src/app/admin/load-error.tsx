/**
 * The one line an admin page shows when a query fails, in place of the empty
 * state it would otherwise fall back to: a failed load must never read as
 * "nothing here" (no session, 0 voices, no summary), or an admin may act on it.
 */
export function LoadError({ what }: { what: string }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      Couldn&apos;t load {what}. Reload the page to try again.
    </p>
  );
}
