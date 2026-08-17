"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_ISO,
  findCountry,
  flagFromIso,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

export function CountryCodeSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const selected = findCountry(value);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll the selected country into view whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[data-selected="true"]')
        ?.scrollIntoView({ block: "center" });
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  // Pin the default country (e.g. Costa Rica) at the top, then sort the rest A-Z.
  const pinned = findCountry(DEFAULT_COUNTRY_ISO);
  const rest = COUNTRIES.filter((c) => c.iso !== pinned.iso).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          "group flex h-11 shrink-0 items-center gap-1.5 rounded-l-lg border border-r-0 bg-background px-3 text-sm font-medium tabular-nums transition-colors",
          "hover:bg-muted/60 data-[popup-open]:bg-muted/60 data-[popup-open]:ring-2 data-[popup-open]:ring-ring",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={t("countryAria", { name: selected.name, dial: selected.dial })}
      >
        <span className="text-base leading-none" aria-hidden>
          {flagFromIso(selected.iso)}
        </span>
        <span className="text-muted-foreground">+{selected.dial}</span>
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground/70 transition-colors group-hover:text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[320px] overflow-hidden rounded-lg p-0 shadow-lg"
      >
        <Command
          filter={(value, search) => {
            // value is "Name|+dial|ISO" — match against any segment
            const haystack = value.toLowerCase();
            const needle = search.toLowerCase().replace(/^\+/, "");
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t("countrySearch")} />
          <CommandList ref={listRef} className="max-h-[320px]">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {t("countryNotFound")}
            </CommandEmpty>
            <CommandGroup>
              <CountryRow
                country={pinned}
                selected={selected.iso === pinned.iso}
                onSelect={() => {
                  onChange(pinned.iso);
                  setOpen(false);
                }}
              />
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {rest.map((c) => (
                <CountryRow
                  key={c.iso}
                  country={c}
                  selected={selected.iso === c.iso}
                  onSelect={() => {
                    onChange(c.iso);
                    setOpen(false);
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CountryRow({
  country,
  selected,
  onSelect,
}: {
  country: { iso: string; name: string; dial: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${country.name}|+${country.dial}|${country.iso}`}
      onSelect={onSelect}
      data-selected={selected ? "true" : undefined}
      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm aria-selected:bg-muted"
    >
      <span className="text-lg leading-none" aria-hidden>
        {flagFromIso(country.iso)}
      </span>
      <span className="truncate">{country.name}</span>
      <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
        +{country.dial}
      </span>
      {selected && <CheckIcon className="size-3.5 shrink-0 text-foreground" />}
    </CommandItem>
  );
}
