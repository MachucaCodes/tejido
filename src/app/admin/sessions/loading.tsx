// Shown while a session page's queries run, so a click gets feedback.
export default function SessionsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-px bg-border" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border bg-card p-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
