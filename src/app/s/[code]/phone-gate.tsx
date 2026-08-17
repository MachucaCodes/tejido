"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { PhoneAuthFlow } from "@/components/phone-auth";
import { logEvent } from "@/lib/client-log";

/**
 * First-share gate, shown after the facilitator emits [READY_TO_SHARE].
 * Collects a phone number (so the participant can return later) and optional
 * name + lot. Analysis is already in flight by the time this mounts — see
 * ChatClient — so completing here just settles the optional details and hands
 * back to the parent, which swaps in the room view.
 */
export function PhoneGate({
  sessionCode,
  onComplete,
}: {
  sessionCode: string;
  onComplete: () => void;
}) {
  const t = useTranslations("gate");

  useEffect(() => {
    logEvent("gate.mount", { sessionCode });
  }, [sessionCode]);

  return (
    <div className="rounded-2xl border border-dashed bg-card p-4 shadow-sm">
      <PhoneAuthFlow
        sessionCode={sessionCode}
        onComplete={onComplete}
        intro={
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="text-xs text-muted-foreground">{t("body")}</p>
          </div>
        }
      />
    </div>
  );
}
