"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { logEvent } from "@/lib/client-log";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    logEvent("profile.logout", {});
    // Clears the phone session cookie. The next visit to /s/* or / re-mints a
    // fresh anonymous user (the proxy only skips minting while a session
    // cookie is still present), so the person becomes a guest again.
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "rounded-full border border-border/80 bg-background/60 px-4 py-2",
        "font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground",
        "transition-colors hover:border-destructive/50 hover:text-destructive",
        "disabled:opacity-50",
      )}
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
