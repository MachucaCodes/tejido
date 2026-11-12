import { redirect } from "next/navigation";

// The sessions list lives at /admin now; keep old links working.
export default function AdminSessionsList() {
  redirect("/admin");
}
