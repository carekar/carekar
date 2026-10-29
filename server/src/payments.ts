import { formatINR } from "../../lib/site";
import type { Lead } from "../../lib/types";
import { notifyPayment } from "./notify";
import { paymentMethod, type RazorpayPayment } from "./razorpay";
import { repo } from "./repo";

/**
 * Records a captured Razorpay payment against a lead (once: the checkout verify call and the
 * webhook can both report the same payment), makes the lead active and alerts the team.
 */
export async function recordOnlinePayment(lead: Lead, pay: Pick<RazorpayPayment, "id" | "amount" | "method" | "created_at">) {
  const amount = Math.round(pay.amount / 100);
  const recorded = await repo().recordPayment({ ...fields(lead, pay), status: "captured" });
  if (recorded) await notifyPayment({ id: lead.id, ref: lead.ref, name: lead.name, amount: formatINR(amount), method: pay.method });
  return recorded;
}

/** A failed attempt, shown on the Payments page for follow-up. The booking stays as it is. */
export const recordFailedPayment = (lead: Lead, pay: Pick<RazorpayPayment, "id" | "amount" | "method" | "created_at">) =>
  repo().recordPayment({ ...fields(lead, pay), status: "failed" });

const fields = (lead: Lead, pay: Pick<RazorpayPayment, "id" | "amount" | "method" | "created_at">) => ({
  leadId: lead.id,
  amount: Math.round(pay.amount / 100),
  method: paymentMethod(pay.method),
  at: new Date((pay.created_at || Date.now() / 1000) * 1000).toISOString(),
  razorpayPaymentId: pay.id,
});
