"use client";

import { ListFilterIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FilterOption = { value: string; label: string; count: number; href: string };
export type FilterGroup = { label: string; current: string; options: FilterOption[] };
export type FilterChip = { label: string; removeHref: string };

/**
 * One "Filter" button that opens the choices, with what is switched on shown
 * as small removable chips. The server only passes options present in the
 * data, so no choice leads to an empty list.
 */
export default function LogsFilter({
  groups,
  chips,
}: {
  groups: FilterGroup[];
  chips: FilterChip[];
}) {
  const router = useRouter();
  const shown = groups.filter((g) => g.options.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {shown.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <ListFilterIcon aria-hidden />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {shown.map((g, i) => (
              <DropdownMenuGroup key={g.label}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{g.label}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={g.current}
                  onValueChange={(v) => {
                    const o = g.options.find((x) => x.value === v);
                    if (o) router.push(o.href);
                  }}
                >
                  {g.options.map((o) => (
                    <DropdownMenuRadioItem key={o.value} value={o.value} closeOnClick>
                      {o.label}
                      {o.value !== "all" && (
                        <span className="ml-auto tabular-nums text-xs text-muted-foreground">
                          {o.count}
                        </span>
                      )}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {chips.map((c) => (
        <Link
          key={c.label}
          href={c.removeHref}
          aria-label={`Remove filter ${c.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 hover:bg-accent"
        >
          {c.label}
          <XIcon className="size-3" aria-hidden />
        </Link>
      ))}
    </div>
  );
}
