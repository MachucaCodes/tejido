"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * The header's content box. On admin pages it takes the admin bar's grid
 * (max-w-4xl, px-4) so the logo and account line up with the nav and page.
 */
export function SiteHeaderGrid({ children }: { children: React.ReactNode }) {
  const admin = (usePathname() ?? "").startsWith("/admin");
  return (
    <div
      className={cn(
        "mx-auto flex h-16 items-center justify-between",
        admin ? "max-w-4xl px-4" : "max-w-3xl px-5 sm:px-8",
      )}
    >
      {children}
    </div>
  );
}
