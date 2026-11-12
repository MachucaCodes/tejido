import Link from "next/link";
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
      <header className="space-y-1">
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← {guard.isAdmin ? "Sessions" : "Your sessions"}
        </Link>
        <h1 className="text-lg font-semibold">New session</h1>
      </header>
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
