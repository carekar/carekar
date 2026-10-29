import { createHmac, timingSafeEqual } from "crypto";
import { planByVehicle } from "../../lib/site";
import type { Lead, Payment } from "../../lib/types";
import { siteUrl } from "./notify";

// Razorpay, two ways to pay the same amount due:
//  • Payment Links: the team creates one from the dashboard and sends it on WhatsApp.
//  • Standard Checkout: the customer taps Pay on /account, which opens Razorpay's modal for
//    an order created here, and the API verifies the signature before recording anything.
// Both are also confirmed by POST /api/webhooks/razorpay. Test Mode keys first, Live after KYC.

const keyId = () => process.env.RAZORPAY_KEY_ID || "";

export const razorpayConfigured = () => !!(keyId() && process.env.RAZORPAY_KEY_SECRET);

/** The public key the checkout modal needs (never the secret). */
export const publicKeyId = keyId;

/** "live", "test" or "off" (for /health) */
export const razorpayMode = () => (!razorpayConfigured() ? "off" : keyId().startsWith("rzp_live_") ? "live" : "test");

const fail = (status: number, message: string) => Object.assign(new Error(message), { status, expose: true });

/** Amount due for one month (or the one-time cleaning), all vehicles, in rupees. */
export const amountDue = (l: Pick<Lead, "planPrice" | "vehicleCount">) => l.planPrice * (l.vehicleCount || 1);

const describe = (l: Lead) =>
  `Carekar ${l.service === "one_time" ? "one-time cleaning" : "monthly plan"} · ${planByVehicle(l.vehicle)?.label ?? l.vehicle}${l.vehicleCount > 1 ? ` × ${l.vehicleCount}` : ""} · ${l.ref}`;

/** Razorpay's receipt / reference id: unique per attempt, so each month gets its own. */
const reference = (l: Lead) => `${l.ref}-${Date.now().toString(36)}`;

async function rzp<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch("https://api.razorpay.com/v1" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic " + Buffer.from(`${keyId()}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64"),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw fail(502, "Couldn't reach Razorpay. Please try again.");
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: { description?: string } }) | null;
  if (res.status === 401) throw fail(500, "Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  if (!res.ok || !json) throw fail(502, "Razorpay: " + (json?.error?.description || res.statusText));
  return json;
}

export async function createPaymentLink(lead: Lead) {
  const amount = amountDue(lead);
  const link = await rzp<{ id: string; short_url: string }>("/payment_links", {
    amount: amount * 100, // paise
    currency: "INR",
    description: describe(lead),
    reference_id: reference(lead),
    customer: { name: lead.name, contact: "+91" + lead.mobile, ...(lead.customerEmail ? { email: lead.customerEmail } : {}) },
    notify: { sms: false, email: false }, // the team sends it on WhatsApp
    reminder_enable: false,
    notes: { lead_id: lead.id, ref: lead.ref },
    callback_url: siteUrl() + "/account",
    callback_method: "get",
  });
  return { id: link.id, url: link.short_url, amount };
}

type Order = { id: string; amount: number; currency: string; notes?: { lead_id?: string } };

/** An order for the checkout modal. The amount always comes from the lead, never the browser. */
export async function createOrder(lead: Lead) {
  const amount = amountDue(lead) * 100;
  if (amount < 100) throw fail(422, "Amount must be at least ₹1");
  const order = await rzp<Order>("/orders", { amount, currency: "INR", receipt: reference(lead), notes: { lead_id: lead.id, ref: lead.ref } });
  return { orderId: order.id, amount: order.amount, currency: order.currency, description: describe(lead) };
}

export const fetchOrder = (id: string) => rzp<Order>("/orders/" + encodeURIComponent(id));

/** What checkout returns on success: HMAC-SHA256(order_id + "|" + payment_id) with the key secret. */
export function validCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  return safeEqual(createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(orderId + "|" + paymentId).digest("hex"), signature);
}

/** Checks X-Razorpay-Signature: HMAC-SHA256 of the exact request bytes with the webhook secret. */
export function validSignature(raw: Buffer, signature: string | undefined) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(createHmac("sha256", secret).update(raw).digest("hex"), signature);
}

function safeEqual(expected: string, given: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type RazorpayPayment = { id: string; order_id?: string; amount: number; currency: string; status: string; method?: string; created_at?: number };

/** The payment as Razorpay has it, captured if it was only authorised. */
export async function capturedPayment(id: string) {
  const p = await rzp<RazorpayPayment>("/payments/" + encodeURIComponent(id));
  if (p.status === "authorized") return rzp<RazorpayPayment>(`/payments/${encodeURIComponent(id)}/capture`, { amount: p.amount, currency: p.currency });
  return p;
}

const methods = ["upi", "card", "netbanking", "wallet", "emi"] as const;

export const paymentMethod = (m: unknown): Payment["method"] =>
  methods.includes(m as (typeof methods)[number]) ? (m as Payment["method"]) : "other";
