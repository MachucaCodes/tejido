"use client";

import { InfoIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Small "i" next to a label; the explanation lives behind it. A Popover, not a
 * Tooltip, so a tap on a phone opens it too (it also opens on hover).
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        openOnHover
        aria-label={label}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <InfoIcon className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-xs text-xs">
        {children}
      </PopoverContent>
    </Popover>
  );
}
