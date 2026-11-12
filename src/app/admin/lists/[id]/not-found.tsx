import Link from "next/link";

export default function ListNotFound() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-6">
      <h1 className="text-lg font-semibold">List not found</h1>
      <p className="text-sm text-muted-foreground">
        This list doesn&apos;t exist. It may have been deleted.
      </p>
      <Link
        href="/admin/lists"
        className="inline-block rounded border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
      >
        ← Lists
      </Link>
    </div>
  );
}
