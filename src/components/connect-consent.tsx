"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/client-log";

/** Saves the participant's connect choice for one session. */
export async function saveConnectConsent(sessionCode: string, consent: boolean) {
  const res = await fetch("/api/connect-consent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionCode, consent }),
  });
  logEvent("connect.consent", { sessionCode, consent, ok: res.ok, status: res.status });
  return res.ok;
}

/**
 * The standing on/off control for a "connect" session. Shown in the room and
 * on the profile page, so a participant can always see their current choice
 * and change it — including returning participants who never pass the phone
 * gate where the checkbox first appears.
 *
 * Off-state doubles as the consent ask, so it carries the full consent copy.
 */
export function ConnectConsentCard({
  sessionCode,
  consented,
  onChange,
}: {
  sessionCode: string;
  consented: boolean;
  onChange?: (consented: boolean) => void;
}) {
  const t = useTranslations("connect");
  const [on, setOn] = useState(consented);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Follow the parent when the choice was made elsewhere (the phone gate).
  const [seen, setSeen] = useState(consented);
  if (seen !== consented) {
    setSeen(consented);
    setOn(consented);
  }

  const set = async (next: boolean) => {
    setBusy(true);
    setFailed(false);
    const ok = await saveConnectConsent(sessionCode, next);
    setBusy(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setOn(next);
    onChange?.(next);
  };

  return (
    <section
      className={
        on
          ? "flex w-full max-w-[40rem] flex-col gap-2.5 rounded-2xl border border-[var(--primary)]/60 bg-card p-4"
          : "flex w-full max-w-[40rem] flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-4"
      }
    >
      <div className="flex items-center gap-2 text-[var(--primary)]">
        <Users className="size-4 shrink-0" aria-hidden />
        <p className="text-sm font-medium">
          {on ? t("onTitle") : t("consentLabel")}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {on ? t("onBody") : t("consentBody")}
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant={on ? "outline" : "default"}
          disabled={busy}
          onClick={() => void set(!on)}
        >
          {busy ? t("saving") : on ? t("turnOff") : t("turnOn")}
        </Button>
      </div>
      {failed && <p className="text-xs text-destructive">{t("saveFailed")}</p>}
    </section>
  );
}
