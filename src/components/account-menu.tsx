"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { PhoneAuthFlow } from "@/components/phone-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { logEvent } from "@/lib/client-log";
import { cn } from "@/lib/utils";

/**
 * Right-side header slot. A signed-in participant (phone-keyed) sees their
 * name. A guest (anonymous) sees a "Sign in" affordance that opens the phone
 * OTP flow — the way back in for someone returning on a new device/browser
 * who would otherwise land on a fresh empty anonymous session.
 */
export function AccountMenu({
  fullName,
  isAuthed,
}: {
  fullName: string | null;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Claim the in-progress draft only when we're actually inside a session.
  const sessionMatch = pathname?.match(/^\/s\/([^/]+)/);
  const sessionCode = sessionMatch ? decodeURIComponent(sessionMatch[1]) : undefined;

  if (isAuthed) {
    if (!fullName) return null;
    return (
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">
        {fullName}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          logEvent("header.signin.open", { sessionCode: sessionCode ?? null });
          setOpen(true);
        }}
        className={cn(
          "rounded-full border border-border/80 bg-background/60 px-3 py-1",
          "font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground sm:text-[10px]",
          "transition-colors hover:border-[var(--accent)]/60 hover:text-foreground",
        )}
      >
        Sign in
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "!max-w-[26rem] !gap-0 !rounded-2xl !bg-card !p-0",
            "ring-1 ring-[var(--accent)]/15",
          )}
        >
          <div className="border-b border-border/70 px-6 py-4">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[var(--accent)]">
              Welcome back
            </p>
            <p className="mt-1 font-display text-[1.05rem] italic leading-none text-foreground">
              Pick up where you left off
            </p>
          </div>
          <div className="px-6 py-5">
            <PhoneAuthFlow
              sessionCode={sessionCode}
              intro={
                <p className="text-xs text-muted-foreground">
                  Enter the phone number you used before — we&apos;ll text a
                  6-digit code to bring back your conversation and what the
                  room has shared.
                </p>
              }
              onComplete={() => {
                logEvent("header.signin.complete", {
                  sessionCode: sessionCode ?? null,
                });
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
