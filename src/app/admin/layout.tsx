import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <nav className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/admin" className="text-sm font-medium">
            Tejido admin
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
