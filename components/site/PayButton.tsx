"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { formatINR } from "@/lib/site";
import { track } from "@/lib/track";

// Razorpay Standard Checkout on /account. The API creates the order (the amount comes from
// the booking, not the browser) and verifies the signature before the booking is marked paid.

type CheckoutResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type Checkout = { open(): void; on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void };

declare global {
  interface Window {
    Razorpay?: new (options: object) => Checkout;
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

/** Loads Razorpay's script on first tap only, so the rest of the site never downloads it. */
function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = CHECKOUT_JS;
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove();
      reject(new Error("Couldn't load Razorpay. Check your internet connection and try again."));
    };
    document.body.appendChild(s);
  });
}

export function PayButton({ bookingRef, amount, token, onPaid }: { bookingRef: string; amount: number; token: () => Promise<string | undefined>; onPaid: () => void }) {
  const [busy, setBusy] = useState<"" | "opening" | "verifying">("");
  const [error, setError] = useState("");
  const base = `/api/me/bookings/${encodeURIComponent(bookingRef)}`;

  async function call<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(base + path, {
      method: "POST",
      headers: { authorization: "Bearer " + (await token()), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
    return json as T;
  }

  async function verify(r: CheckoutResponse) {
    setBusy("verifying");
    try {
      await call("/verify", r);
      track("payment_success", { amount });
      onPaid();
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "We couldn't confirm your payment.") + " If money was deducted, it will be confirmed automatically, or WhatsApp us your booking ref.",
      );
    } finally {
      setBusy("");
    }
  }

  async function pay() {
    setError("");
    setBusy("opening");
    track("payment_started", { amount });
    try {
      await loadCheckout();
      const order = await call<{ keyId: string; orderId: string; amount: number; currency: string; description: string; prefill: object }>("/order");
      let failed = "";
      const checkout = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Carekar",
        description: order.description,
        prefill: order.prefill,
        theme: { color: "#0F5C36" },
        handler: verify,
        modal: {
          ondismiss: () => {
            setBusy("");
            setError(failed || "Payment cancelled. You can try again any time.");
            track(failed ? "payment_failed" : "payment_cancelled", { amount });
          },
        },
      });
      // Razorpay keeps the modal open so the customer can retry with another method
      checkout.on("payment.failed", (r) => {
        failed = (r.error?.description || "Payment failed") + ". No money was taken; please try again.";
      });
      checkout.open();
    } catch (e) {
      setBusy("");
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
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
