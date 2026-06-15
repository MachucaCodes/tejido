"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CountryCodeSelect } from "@/components/country-code-select";
import { Button } from "@/components/ui/button";
import { parseLocalPhone } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";

// Admins are phone-keyed and (so far) US-based, so default the picker to the
// US dial code. The picker + parseLocalPhone still accept a full +<country>
// number typed directly, so non-US admins aren't locked out.
const ADMIN_DEFAULT_ISO = "US";

export default function AdminLoginClient({ next = "/admin" }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [iso, setIso] = useState(ADMIN_DEFAULT_ISO);
  const [localNumber, setLocalNumber] = useState("");
  // The validated E.164 we actually sent the OTP to — reused verbatim for
  // verify and display so both steps target the exact number, never a re-guess.
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Normalize to E.164 before calling Supabase. A bare 10-digit number (no
    // country code) doesn't match the stored phone identity, and with
    // shouldCreateUser:false that returns otp_disabled with no SMS sent — a
    // silent dead-end. Validating here turns "503-477-3405" into "+15034773405".
    const parsed = parseLocalPhone(iso, localNumber);
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: parsed.e164,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (err) {
      setError(friendlyError(err.message));
      return;
    }
    setSentTo(parsed.e164);
    setToken("");
    setStep("otp");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: sentTo,
      token,
      type: "sms",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Admin sign-in</h1>
        <p className="text-sm text-muted-foreground">Phone OTP only.</p>
      </div>

      {step === "phone" ? (
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
          <Button type="submit" disabled={busy || !localNumber.trim()} className="w-full">
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Code sent to <span className="tabular-nums">{sentTo}</span>.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-md border bg-background px-3 py-2 text-base tracking-widest"
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
            onClick={() => {
              setError(null);
              setStep("phone");
            }}
          >
            Use a different number
          </button>
        </form>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}

// shouldCreateUser:false means an unknown (or non-admin) number comes back as
// otp_disabled / "Signups not allowed for otp". Translate that GoTrue-speak
// into something an admin can act on instead of a raw API error.
function friendlyError(msg: string): string {
  if (/signups not allowed|otp_disabled/i.test(msg)) {
    return "No admin account found for that number. Check the country flag and that you entered the full number.";
  }
  return msg;
}
