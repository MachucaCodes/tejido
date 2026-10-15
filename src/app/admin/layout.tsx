import Link from "next/link";

import { requireOrganizer } from "@/lib/admin-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Organizers who aren't admins only get the home page (create + their own
  // sessions); the all-sessions and contact-list pages stay admin-only.
  const guard = await requireOrganizer();
  const isAdmin = guard.ok && guard.isAdmin;

  return (
    <div className="min-h-dvh">
      <nav className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {isAdmin ? "Admin" : "Your questions"}
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-4">
              <Link
                href="/admin/sessions"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sessions
              </Link>
              <Link
                href="/admin/lists"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Lists
              </Link>
            </div>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
