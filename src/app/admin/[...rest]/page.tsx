import { notFound } from "next/navigation";

// Any /admin URL that matches no page: show the admin 404 (not-found.tsx)
// inside the admin layout, instead of the bare root 404.
export default function AdminUnknownPage() {
  notFound();
}
