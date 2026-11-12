"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import CreateListForm from "./lists/create-list-form";

/**
 * Admin bar: sticks under the 64px site header and lines up with the page.
 * Sessions and Lists sit together as tabs, with the current one marked. On an
 * index page the bar is the page's title, and its one main button (New
 * session / New list) sits at the right of the same row.
 */
export default function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "";
  const links = [
    // One entry for the sessions list; creating one and a session's own
    // pages count as part of it.
    { href: "/admin", label: isAdmin ? "Sessions" : "Your sessions", match: ["/admin/new", "/admin/sessions"] },
    ...(isAdmin ? [{ href: "/admin/lists", label: "Lists", match: [] as string[] }] : []),
  ];
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const isCurrent = (href: string, match: string[]) =>
    pathname === href || match.some(under) || (href !== "/admin" && under(href));

  const action =
    pathname === "/admin" ? (
      <Link
        href="/admin/new"
        className="rounded border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
      >
        New session
      </Link>
    ) : pathname === "/admin/lists" && isAdmin ? (
      <CreateListForm />
    ) : null;

  return (
    <nav className="sticky top-16 z-10 border-b bg-card" aria-label="Admin">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between gap-4 px-4">
        <div className="flex h-full items-stretch gap-5">
          {links.map((l) => {
            const current = isCurrent(l.href, l.match);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={`-mb-px flex items-center border-b-2 text-sm hover:text-foreground ${
                  current
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        {action}
      </div>
    </nav>
  );
}
