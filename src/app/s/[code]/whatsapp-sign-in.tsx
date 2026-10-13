"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { PhoneAuthFlow } from "@/components/phone-auth";

/**
 * Shown for the WhatsApp results link when the browser isn't signed in. The
 * WhatsApp conversation lives on the phone-keyed account, so signing in by
 * phone lands on it — no anonymous draft to claim.
 */
export function WhatsAppSignIn({ sessionCode }: { sessionCode: string }) {
  const t = useTranslations("whatsappGate");
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <PhoneAuthFlow
          collectDetails={false}
          intro={
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("title")}</p>
              <p className="text-xs text-muted-foreground">{t("body")}</p>
            </div>
          }
          onComplete={() => {
            router.replace(`/s/${encodeURIComponent(sessionCode)}`);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
