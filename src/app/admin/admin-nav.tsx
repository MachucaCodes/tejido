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
    { href: "/admin", label: isAdmin ? "Home" : "Your sessions", exact: true },
    ...(isAdmin
      ? [
          { href: "/admin/sessions", label: "Sessions", exact: false },
          { href: "/admin/lists", label: "Lists", exact: false },
        ]
      : []),
  ];
  const isCurrent = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const [home, ...rest] = links;
  const item = (l: (typeof links)[number]) => {
    const current = isCurrent(l.href, l.exact);
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
