import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import AdminLoginClient from "./login-client";

export default async function AdminLoginPage() {
  const guard = await requireAdmin();
  if (guard.ok) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6">
      <AdminLoginClient />
    </div>
  );
}
