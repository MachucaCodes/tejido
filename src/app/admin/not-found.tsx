import Link from "next/link";

// Shown inside the admin layout (nav bar included) when an admin page calls
// notFound(), e.g. an old or mistyped session link.
export default function AdminNotFound() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-6">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">
        This page doesn&apos;t exist, or the link is old or mistyped.
      </p>
      <Link
        href="/admin"
        className="inline-block rounded border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
      >
        Back to sessions
      </Link>
    </div>
  );
}
