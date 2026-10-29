"use client";

import { track } from "./track";

// Razorpay Standard Checkout for a booking, used when booking (/book) and on My bookings.
// The API creates the order (the amount comes from the booking, never the browser) and
// verifies Razorpay's signature before the booking is marked paid.

type CheckoutResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type Checkout = { open(): void; on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void };
type Order = { keyId: string; orderId: string; amount: number; currency: string; description: string; prefill: object };

declare global {
  interface Window {
    Razorpay?: new (options: object) => Checkout;
  }
}

export type CheckoutResult = { paid: true } | { paid: false; error: string };

/** Loads Razorpay's script on first use only, so the rest of the site never downloads it. */
function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove();
      reject(new Error("Couldn't load Razorpay. Check your internet connection and try again."));
    };
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay for the amount due on a booking. Resolves once the payment is verified by the
 * API, or when the customer closes the window / it fails (with a message to show).
 */
export async function payForBooking(
  bookingRef: string,
  token: () => Promise<string | undefined>,
  { location, onVerifying }: { location: string; onVerifying?: () => void },
): Promise<CheckoutResult> {
  const base = `/api/me/bookings/${encodeURIComponent(bookingRef)}`;
  const call = async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(base + path, {
      method: "POST",
      headers: { authorization: "Bearer " + (await token()), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
    return json as T;
  };

  let order: Order;
  try {
    await loadCheckout();
    order = await call<Order>("/order");
  } catch (e) {
    return { paid: false, error: e instanceof Error ? e.message : "Something went wrong. Please try again." };
  }
  const amount = order.amount / 100;
  track("payment_started", { amount, location });

  return new Promise<CheckoutResult>((resolve) => {
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
      handler: async (r: CheckoutResponse) => {
        onVerifying?.();
        try {
          await call("/verify", r);
          track("payment_success", { amount, location });
          resolve({ paid: true });
        } catch (e) {
          resolve({
            paid: false,
            error: (e instanceof Error ? e.message : "We couldn't confirm your payment.") + " If money was deducted, it will be confirmed automatically, or WhatsApp us your booking ref.",
          });
        }
      },
      modal: {
        ondismiss: () => {
          track(failed ? "payment_failed" : "payment_cancelled", { amount, location });
          resolve({ paid: false, error: failed || "Payment cancelled. Your booking is saved; pay any time to confirm it." });
        },
      },
    });
    // Razorpay keeps the window open so the customer can retry with another method
    checkout.on("payment.failed", (r) => {
      failed = (r.error?.description || "Payment failed") + ". No money was taken; please try again.";
    });
    checkout.open();
  });
}
