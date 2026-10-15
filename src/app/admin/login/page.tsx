import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/admin-guard";
import AdminLoginClient from "./login-client";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only allow same-origin destinations (e.g. the OAuth consent page).
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  const guard = await requireOrganizer();
  if (guard.ok) redirect(dest);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6">
      <AdminLoginClient next={dest} />
    </div>
  );
}
