"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginClient({ next = "/admin" }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const cleaned = phone.replace(/[^\d+]/g, "");
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: cleaned,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPhone(cleaned);
    setStep("otp");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone,
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
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm text-muted-foreground">Code sent to {phone}.</p>
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
        </form>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
