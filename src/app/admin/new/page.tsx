import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import CreateSessionForm from "../create-session-form";
import SessionBuilder from "../session-builder";

// Creating a session gets its own page, opened from "New session" on the list.
export default async function NewSession() {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");

  return (
    <div className="space-y-6">
      {/* No back link: the admin bar's marked Sessions tab is the way back. */}
      <h1 className="text-lg font-semibold">New session</h1>
      <SessionBuilder />
      <details className="space-y-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Or fill in the form yourself
        </summary>
        <CreateSessionForm />
      </details>
    </div>
  );
}
