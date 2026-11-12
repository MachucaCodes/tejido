// Shown while an admin page loads, so a slow load doesn't leave the old page
// up with no sign that anything is happening. Same look as the session
// page's body skeleton.
export default function AdminLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-1/5 animate-pulse rounded bg-muted" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
