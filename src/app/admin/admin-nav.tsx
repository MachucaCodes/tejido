"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin bar: sticks under the 64px site header, lines up with the page
 * content, and marks the section you're in.
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

  const [home, ...rest] = links;
  const item = (l: (typeof links)[number]) => {
    const current = isCurrent(l.href, l.match);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={current ? "page" : undefined}
        className={`text-sm hover:text-foreground ${
          current ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
      >
        {l.label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-16 z-10 border-b bg-card" aria-label="Admin">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        {item(home)}
        {rest.length > 0 && <div className="flex items-center gap-4">{rest.map(item)}</div>}
      </div>
    </nav>
  );
}
