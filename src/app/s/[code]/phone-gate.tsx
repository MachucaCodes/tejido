"use client";

import { useState } from "react";

import { CountryCodeSelect } from "@/components/country-code-select";
import { Button } from "@/components/ui/button";
import { DEFAULT_COUNTRY_ISO, findCountry } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp" | "details" | "finalizing";

export function PhoneGate({
  sessionCode,
  onComplete,
}: {
  sessionCode: string;
  onComplete: () => void;
}) {
  const supabase = createClient();
  const [iso, setIso] = useState(DEFAULT_COUNTRY_ISO);
  const [localNumber, setLocalNumber] = useState("");
  const [token, setToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const country = findCountry(iso);
  const e164 = `+${country.dial}${localNumber.replace(/\D/g, "")}`;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    // Anonymous-user upgrade: updateUser triggers an OTP to the new phone.
    const { error: err } = await supabase.auth.updateUser({ phone: e164 });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStep("otp");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: e164,
      token,
      type: "phone_change",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStep("details");
  };

  const finalize = async () => {
    const res = await fetch("/api/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionCode }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setStep("finalizing");
    // Profile save runs in parallel; finalize is the gating call.
    void fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: fullName, lot_number: lotNumber }),
    });
    try {
      await finalize();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("details");
    } finally {
      setBusy(false);
    }
  };

  const skipDetails = async () => {
    setError(null);
    setBusy(true);
    setStep("finalizing");
    try {
      await finalize();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-dashed bg-card p-4 shadow-sm">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          One last step to see the group&apos;s themes
        </p>
        <p className="text-xs text-muted-foreground">
          We&apos;ll text you a 6-digit code so you can come back to your perspective. Your responses are still shared anonymously with the group.
        </p>
      </div>

      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-3">
          <div className="flex">
            <CountryCodeSelect value={iso} onChange={setIso} />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Phone number"
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
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Code sent to <span className="tabular-nums">{e164}</span>.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base tracking-[0.4em] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            required
            autoFocus
            maxLength={6}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Verifying…" : "Verify"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline"
            onClick={() => setStep("phone")}
          >
            Use a different number
          </button>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={submitDetails} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Optional — your name and lot help organizers follow up. Your responses are still shared anonymously with the group.
          </p>
          <input
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <input
            type="text"
            inputMode="text"
            placeholder="Lot number"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            disabled={busy || (!fullName.trim() && !lotNumber.trim())}
            className="w-full"
          >
            {busy ? "Saving…" : "Save and continue"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline"
            onClick={skipDetails}
            disabled={busy}
          >
            Skip
          </button>
        </form>
      )}

      {step === "finalizing" && (
        <p className="py-2 text-center text-sm text-muted-foreground">
          Pulling your perspective into the group view…
        </p>
      )}

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
