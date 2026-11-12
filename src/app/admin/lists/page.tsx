import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import CreateListForm from "./create-list-form";

export default async function AdminListsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const { data: lists, error } = await createAdmin()
    .from("lists")
    .select("id, name, description, created_at, members:list_members(count)")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Lists</h1>
        <CreateListForm />
      </header>

      {/* A failed load must not look like an empty one, or an admin may
          re-create lists that are still there. */}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load lists. Reload the page to try again.
        </p>
      ) : (lists ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No lists yet.</p>
      ) : (
        <ul className="space-y-2">
          {(lists ?? []).map((l) => {
            const count =
              Array.isArray(l.members) && l.members.length
                ? (l.members[0] as { count: number }).count
                : 0;
            return (
              <li key={l.id}>
                <Link
                  href={`/admin/lists/${l.id}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{l.name}</p>
                    {l.description && (
                      <p className="truncate text-sm text-muted-foreground">{l.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {count} {count === 1 ? "number" : "numbers"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
