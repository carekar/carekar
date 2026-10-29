"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { formatINR } from "@/lib/site";
import { payForBooking } from "@/lib/checkout";

/** "Pay ₹X" on My bookings, for a booking that hasn't been paid yet (or a renewal that's due). */
export function PayButton({ bookingRef, amount, token, onPaid }: { bookingRef: string; amount: number; token: () => Promise<string | undefined>; onPaid: () => void }) {
  const [busy, setBusy] = useState<"" | "opening" | "verifying">("");
  const [error, setError] = useState("");

  async function pay() {
    setError("");
    setBusy("opening");
    const result = await payForBooking(bookingRef, token, { location: "account", onVerifying: () => setBusy("verifying") });
    setBusy("");
    if (result.paid) onPaid();
    else setError(result.error);
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={pay} disabled={!!busy} className="btn-primary w-full disabled:opacity-60">
        {busy === "verifying" ? "Confirming payment…" : busy === "opening" ? "Opening secure payment…" : <>Pay {formatINR(amount)} securely <Icon name="arrowRight" className="size-4" /></>}
      </button>
      <p className="mt-1 text-center text-xs text-ink-400">Payments secured by Razorpay · UPI, cards, netbanking</p>
      {error && (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger" role="alert">
          <Icon name="alert" className="size-5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
