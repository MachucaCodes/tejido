import Link from "next/link";

import { requireOrganizer } from "@/lib/admin-guard";

// A wrong or old session link: back to the sessions list.
export default async function SessionNotFound() {
  const guard = await requireOrganizer();
  const isAdmin = guard.ok && guard.isAdmin;
  return (
    <div className="space-y-3 rounded-lg border bg-card p-6">
      <h1 className="text-lg font-semibold">Session not found</h1>
      <p className="text-sm text-muted-foreground">
        There&apos;s no session at this link. It may be old or mistyped.
      </p>
      <Link
        href="/admin"
        className="inline-block rounded border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
      >
        ← {isAdmin ? "Sessions" : "Your sessions"}
      </Link>
    </div>
  );
}
