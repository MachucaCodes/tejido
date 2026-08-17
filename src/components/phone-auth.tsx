"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { CountryCodeSelect } from "@/components/country-code-select";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/client-log";
import {
  DEFAULT_COUNTRY_ISO,
  findCountry,
  parseLocalPhone,
} from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp" | "details";

const RESEND_COOLDOWN_S = 30;

/**
 * Shared phone sign-in / sign-up flow: phone → OTP → (optional name + lot).
 *
 * Used both by the post-[READY_TO_SHARE] PhoneGate (first share) and by the
 * site-header "I've been here before" sign-in (returning from a new
 * device/browser). The mechanics are identical; only the surrounding copy
 * differs, so callers pass their own `intro` node and chrome.
 *
 * When `sessionCode` is set and the verifying user was anonymous, the draft
 * conversation is reassigned to the now signed-in phone-keyed user via
 * /api/claim-draft. When it's omitted (e.g. signing in from the home page),
 * the claim step is skipped — the OTP simply lands the canonical account.
 */
export function PhoneAuthFlow({
  sessionCode,
  collectDetails = true,
  intro,
  onComplete,
}: {
  sessionCode?: string;
  collectDetails?: boolean;
  intro?: ReactNode;
  onComplete: () => void;
}) {
  const t = useTranslations("auth");
  const supabase = createClient();
  const [iso, setIso] = useState(DEFAULT_COUNTRY_ISO);
  const [localNumber, setLocalNumber] = useState("");
  // The validated E.164 we actually sent the OTP to. Set on a successful send
  // and reused verbatim for resend, verify, and display so every step targets
  // the exact number Twilio accepted — never a re-derived guess.
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    logEvent("gate.step", { step });
  }, [step]);

  const country = findCountry(iso);

  const startResendCooldown = () => {
    setResendIn(RESEND_COOLDOWN_S);
    if (resendTimer.current) clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1 && resendTimer.current) {
          clearInterval(resendTimer.current);
          resendTimer.current = null;
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (resendTimer.current) clearInterval(resendTimer.current);
    };
  }, []);

  const friendlyError = (msg: string) => {
    // GoTrue's own messages are English-only, so we can only match on them.
    // When we recognise the shape we replace it with our own translated copy;
    // anything unrecognised falls through verbatim rather than being hidden.
    if (/expired|invalid/i.test(msg)) {
      return t("errorCodeRejected");
    }
    return msg;
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    // Validate before we ever call Supabase. An invalid number (e.g. a US
    // number left under the Costa Rica default) is rejected by Twilio async,
    // which used to advance the UI to a code screen that never fills. Catch it
    // here and tell the user instead.
    const parsed = parseLocalPhone(iso, localNumber);
    if (!parsed.ok) {
      logEvent("gate.otp.send_invalid", { dial: country.dial, reason: parsed.reason });
      setError(
        parsed.reason === "empty" ? t("errorPhoneEmpty") : t("errorPhoneInvalid"),
      );
      return;
    }
    setBusy(true);
    const startedAt = Date.now();
    logEvent("gate.otp.send_begin", { dial: country.dial });
    // Sign-in OTP: creates a phone-keyed user if new, or signs into the
    // existing one if this human has been here before. Either way, the
    // post-verify session is owned by the canonical phone-keyed user.
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: parsed.e164,
    });
    setBusy(false);
    if (err) {
      logEvent("gate.otp.send_error", {
        message: err.message,
        duration_ms: Date.now() - startedAt,
      });
      setError(err.message);
      return;
    }
    logEvent("gate.otp.send_ok", { duration_ms: Date.now() - startedAt });
    setSentTo(parsed.e164);
    setToken("");
    startResendCooldown();
    setStep("otp");
  };

  const resendOtp = async () => {
    if (resendIn > 0 || busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: sentTo });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setToken("");
    setInfo(t("newCodeSent"));
    startResendCooldown();
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    const cleanToken = token.replace(/\D/g, "");
    if (cleanToken.length !== 6) {
      setBusy(false);
      logEvent("gate.otp.verify_short_token", { length: cleanToken.length });
      setError(t("errorSixDigits"));
      return;
    }
    const beforeId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const verifyStart = Date.now();
    logEvent("gate.otp.verify_begin", { hasBeforeId: Boolean(beforeId) });
    const { error: err } = await supabase.auth.verifyOtp({
      phone: sentTo,
      token: cleanToken,
      type: "sms",
    });
    if (err) {
      logEvent("gate.otp.verify_error", {
        message: err.message,
        duration_ms: Date.now() - verifyStart,
      });
      setBusy(false);
      setToken("");
      setError(friendlyError(err.message));
      return;
    }
    logEvent("gate.otp.verify_ok", { duration_ms: Date.now() - verifyStart });
    // Reassign the draft conversation to the (now signed-in) real user. If
    // beforeId === current user id, the endpoint no-ops. If the human had
    // already completed this session, claim-draft returns 409 and we route
    // straight to their existing view. Only runs when we're in a session.
    if (sessionCode && beforeId) {
      const claimStart = Date.now();
      logEvent("gate.claim_draft.begin", { anonUserId: beforeId });
      const res = await fetch("/api/claim-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionCode, anonUserId: beforeId }),
      });
      logEvent("gate.claim_draft.end", {
        status: res.status,
        ok: res.ok,
        duration_ms: Date.now() - claimStart,
      });
      if (res.status === 409) {
        setBusy(false);
        onComplete();
        return;
      }
      if (!res.ok) {
        setBusy(false);
        setError(await res.text());
        return;
      }
    }
    if (!collectDetails) {
      setBusy(false);
      onComplete();
      return;
    }

    // Returning users who already have a name or lot on file shouldn't be
    // asked again — only show the details step for accounts missing both. If
    // the lookup fails, fall through to the step rather than risk dropping a
    // genuinely new user's details.
    let hasProfile = false;
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const p = (await res.json()) as {
          full_name?: string | null;
          lot_number?: string | null;
        };
        hasProfile = Boolean(p.full_name || p.lot_number);
      }
    } catch {
      hasProfile = false;
    }
    setBusy(false);
    if (hasProfile) {
      logEvent("gate.details.skipped_existing_profile", {});
      onComplete();
    } else {
      setStep("details");
    }
  };

  // Mobile networks frequently drop a request mid-flight even when the
  // server completed it. /api/profile is idempotent, so it's safe to
  // retry on transient fetch errors before surfacing one.
  const fetchWithRetry = async (
    input: RequestInfo,
    init: RequestInit,
    attempts = 3,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.url;
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await fetch(input, init);
        if (i > 0) {
          logEvent("gate.fetch.retry_success", { url, attempt: i + 1 });
        }
        return res;
      } catch (err) {
        lastErr = err;
        logEvent("gate.fetch.attempt_failed", {
          url,
          attempt: i + 1,
          willRetry: i < attempts - 1,
          message: err instanceof Error ? err.message : String(err),
        });
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  };

  const friendlyNetworkError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (/failed to fetch|network|load failed/i.test(msg)) {
      return t("errorNetworkSave");
    }
    return msg;
  };

  const saveProfile = async () => {
    const res = await fetchWithRetry("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: fullName, lot_number: lotNumber }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const startedAt = Date.now();
    logEvent("gate.submit_details.begin", {
      hasName: Boolean(fullName.trim()),
      hasLot: Boolean(lotNumber.trim()),
    });
    try {
      await saveProfile();
      logEvent("gate.submit_details.success", {
        duration_ms: Date.now() - startedAt,
      });
      onComplete();
    } catch (err) {
      logEvent("gate.submit_details.error", {
        duration_ms: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
      });
      setError(friendlyNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  const skipDetails = () => {
    setError(null);
    logEvent("gate.submit_details.skip", {});
    onComplete();
  };

  return (
    <div className="space-y-3">
      {intro}

      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-3">
          <div className="flex">
            <CountryCodeSelect value={iso} onChange={setIso} />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={t("phonePlaceholder")}
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              className="h-11 w-full min-w-0 flex-1 rounded-r-lg border bg-background px-3 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
              required
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !localNumber.trim()}
            className="w-full"
          >
            {busy ? t("sending") : t("sendCode")}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t.rich("codeSentTo", {
              number: sentTo,
              num: (chunks) => <span className="tabular-nums">{chunks}</span>,
            })}
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            placeholder="123456"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base tracking-[0.4em] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            required
            autoFocus
            maxLength={6}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? t("verifying") : t("verify")}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="text-muted-foreground underline"
              onClick={() => {
                setError(null);
                setInfo(null);
                setStep("phone");
              }}
            >
              {t("useDifferentNumber")}
            </button>
            <button
              type="button"
              className="text-muted-foreground underline disabled:no-underline disabled:opacity-50"
              onClick={resendOtp}
              disabled={busy || resendIn > 0}
            >
              {resendIn > 0
                ? t("resendIn", { seconds: resendIn })
                : t("resendCode")}
            </button>
          </div>
          {info && (
            <p className="text-center text-xs text-muted-foreground">{info}</p>
          )}
        </form>
      )}

      {step === "details" && (
        <form onSubmit={submitDetails} className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("detailsIntro")}</p>
          <input
            type="text"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <input
            type="text"
            inputMode="text"
            placeholder={t("lotPlaceholder")}
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            disabled={busy || (!fullName.trim() && !lotNumber.trim())}
            className="w-full"
          >
            {busy ? t("saving") : t("saveAndContinue")}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline"
            onClick={skipDetails}
            disabled={busy}
          >
            {t("skip")}
          </button>
        </form>
      )}

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
