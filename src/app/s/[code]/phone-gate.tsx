"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { saveConnectConsent } from "@/components/connect-consent";
import { PhoneAuthFlow } from "@/components/phone-auth";
import { logEvent } from "@/lib/client-log";

/**
 * First-share gate, shown after the facilitator emits [READY_TO_SHARE].
 * Collects a phone number (so the participant can return later) and optional
 * name + lot. Analysis is already in flight by the time this mounts — see
 * ChatClient — so completing here just settles the optional details and hands
 * back to the parent, which swaps in the room view.
 *
 * In a "connect" session the phone step also carries the opt-in checkbox
 * (unchecked by default). The choice is saved once the phone is verified —
 * only then is there a phone-keyed participant to attach it to.
 */
export function PhoneGate({
  sessionCode,
  connect,
  onComplete,
}: {
  sessionCode: string;
  connect: boolean;
  onComplete: (connectConsent: boolean) => void;
}) {
  const t = useTranslations("gate");
  const tc = useTranslations("connect");
  const [wantsConnect, setWantsConnect] = useState(false);

  useEffect(() => {
    logEvent("gate.mount", { sessionCode });
  }, [sessionCode]);

  return (
    <div className="rounded-2xl border border-dashed bg-card p-4 shadow-sm">
      <PhoneAuthFlow
        sessionCode={sessionCode}
        onComplete={async () => {
          // If the save fails they simply stay opted out; the card in the
          // room lets them try again.
          const saved =
            connect && wantsConnect
              ? await saveConnectConsent(sessionCode, true)
              : false;
          onComplete(saved);
        }}
        phoneStepExtra={
          connect ? (
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--primary)]/60 bg-background p-3">
                <input
                  type="checkbox"
                  checked={wantsConnect}
                  onChange={(e) => setWantsConnect(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    {tc("consentLabel")}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {tc("consentBody")}
                  </span>
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                {tc("consentOptional")}
              </p>
            </div>
          ) : null
        }
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
