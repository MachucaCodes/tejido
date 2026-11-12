import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateSessionForm from "../create-session-form";
import SessionBuilder from "../session-builder";

// Creating a session gets its own page, opened from "New session" on the list.
// Most people fill in the form, so it opens first; drafting with AI is the
// second tab, switched from the title row. Both stay mounted so switching
// doesn't lose what was typed.
export default async function NewSession() {
  const guard = await requireOrganizer();
  if (!guard.ok) redirect("/admin/login");

  return (
    <Tabs defaultValue="form" className="gap-6">
      <header className="space-y-1">
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← {guard.isAdmin ? "Sessions" : "Your sessions"}
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">New session</h1>
          <TabsList>
            <TabsTrigger value="form" className="px-3">
              Form
            </TabsTrigger>
            <TabsTrigger value="ai" className="px-3">
              Draft with AI
            </TabsTrigger>
          </TabsList>
        </div>
      </header>
      <TabsContent value="form" keepMounted>
        <CreateSessionForm />
      </TabsContent>
      <TabsContent value="ai" keepMounted>
        <SessionBuilder />
      </TabsContent>
    </Tabs>
  );
}
