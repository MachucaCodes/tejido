import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import AddMembersForm from "./add-members-form";
import EditListForm from "./edit-list-form";
import RemoveMemberButton from "./remove-member-button";

type MemberRow = {
  contacts: {
    id: string;
    phone: string;
    name: string | null;
    language: string | null;
  } | null;
};

export default async function AdminListDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");
  const { id } = await params;
  const admin = createAdmin();

  const { data: list } = await admin
    .from("lists")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();
  if (!list) notFound();

  const { data: rows } = await admin
    .from("list_members")
    .select("contacts(id, phone, name, language)")
    .eq("list_id", id)
    .order("created_at", { ascending: true })
    .returns<MemberRow[]>();
  const members = (rows ?? []).flatMap((r) => (r.contacts ? [r.contacts] : []));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link href="/admin/lists" className="text-xs text-muted-foreground hover:text-foreground">
          ← Lists
        </Link>
        <h1 className="text-lg font-semibold">{list.name}</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "number" : "numbers"}
        </p>
      </header>

      <AddMembersForm listId={list.id} memberPhones={members.map((m) => m.phone)} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No numbers yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  {m.name && <p className="truncate font-medium">{m.name}</p>}
                  <p className={m.name ? "font-mono text-xs text-muted-foreground" : "font-mono"}>
                    {m.phone}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {m.language && (
                    <span className="text-xs uppercase text-muted-foreground">{m.language}</span>
                  )}
                  <RemoveMemberButton listId={list.id} contactId={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EditListForm listId={list.id} name={list.name} description={list.description} />
    </div>
  );
}
