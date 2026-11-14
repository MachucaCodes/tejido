"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Quiet header link into admin for organizers. Hidden on admin pages, which
 * have their own nav.
 */
export function AdminLink({ label }: { label: string }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/admin"
      className={cn(
        "rounded-full px-2.5 py-1",
        "font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]",
        "transition-colors hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
