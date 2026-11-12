import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import NewSession from "./new-session";

// Creating a session gets its own page, opened from "New session" on the list.
export default async function NewSessionPage() {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");

  return (
    <div className="space-y-6">
      {/* No back link: the admin bar's marked Sessions tab is the way back. */}
      <h1 className="text-lg font-semibold">New session</h1>
      <NewSession userId={guard.user.id} />
    </div>
  );
}
