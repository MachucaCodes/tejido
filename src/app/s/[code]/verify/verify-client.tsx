"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp" | "finalizing";

export default function VerifyClient({
  sessionCode,
  question,
}: {
  sessionCode: string;
  question: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const cleaned = phone.replace(/[^\d+]/g, "");
    const { error: err } = await supabase.auth.updateUser({ phone: cleaned });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPhone(cleaned);
    setStep("otp");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "phone_change",
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    setStep("finalizing");
    const res = await fetch("/api/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionCode }),
    });
    if (!res.ok) {
      setError(await res.text());
      setBusy(false);
      return;
    }
    router.push(`/s/${sessionCode}/themes`);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">One step before you see the themes</h1>
        <p className="text-sm text-muted-foreground">
          Verify your phone to view how your perspective fits with the rest of the group.
        </p>
        <p className="text-xs text-muted-foreground/80 italic">{question}</p>
      </div>

      {step === "phone" && (
        <form className="w-full space-y-3" onSubmit={sendOtp}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-base"
            required
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form className="w-full space-y-3" onSubmit={verifyOtp}>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to {phone}.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-base tracking-widest"
            required
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

      {step === "finalizing" && (
        <p className="text-sm text-muted-foreground">
          Pulling your perspective into the group view…
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
