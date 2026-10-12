import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import CreateListForm from "./create-list-form";

export default async function AdminListsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const { data: lists } = await createAdmin()
    .from("lists")
    .select("id, name, description, created_at, members:list_members(count)")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Lists</h1>
        <p className="text-sm text-muted-foreground">
          Named groups of phone numbers. A number can be in more than one list.
        </p>
      </header>

      <CreateListForm />

      {(lists ?? []).length === 0 ? (
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
