import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import AddMembersForm from "./add-members-form";
import EditListForm from "./edit-list-form";
import RemoveMemberButton from "./remove-member-button";
import { isLocale } from "@/i18n/locales";
import { contactLanguage } from "@/lib/whatsapp-conversation";

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

  const { data: list, error: listError } = await admin
    .from("lists")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();
  // A malformed id (22P02: not a uuid) is a missing list. Any other failed
  // load is not: say so instead of showing a 404.
  if (listError?.code === "22P02") notFound();
  if (listError) {
    return (
      <div className="space-y-2">
        <Link href="/admin/lists" className="text-xs text-muted-foreground hover:text-foreground">
          ← Lists
        </Link>
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load this list. Reload the page to try again.
        </p>
      </div>
    );
  }
  if (!list) notFound();

  const { data: rows, error: membersError } = await admin
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
        {list.description && (
          <p className="text-sm text-muted-foreground">{list.description}</p>
        )}
        {!membersError && (
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "number" : "numbers"}
          </p>
        )}
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Members</h2>
          {!membersError && (
            <AddMembersForm listId={list.id} memberPhones={members.map((m) => m.phone)} />
          )}
        </div>
        {membersError ? (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load the numbers in this list. Reload the page to try again.
          </p>
        ) : members.length === 0 ? (
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
                  {/* Effective language: the saved one, else the same default
                      the invite sender uses, marked (auto). */}
                  <span className="text-xs text-muted-foreground">
                    <span className="uppercase">{contactLanguage(m)}</span>
                    {!isLocale(m.language) && <span className="ml-1 opacity-70">(auto)</span>}
                  </span>
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
