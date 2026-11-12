
import { requireOrganizer } from "@/lib/admin-guard";
import AdminNav from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Organizers who aren't admins only get the home page (create + their own
  // sessions); the all-sessions and contact-list pages stay admin-only.
  const guard = await requireOrganizer();
  const isAdmin = guard.ok && guard.isAdmin;
  // Signed out (the login page): no nav, every link would lead back here.
  if (!guard.ok) return <main className="flex-1">{children}</main>;

  return (
    <div className="min-h-dvh">
      <AdminNav isAdmin={isAdmin} />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
