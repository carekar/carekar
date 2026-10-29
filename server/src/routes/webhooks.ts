import express, { Router } from "express";
import { recordOnlinePayment } from "../payments";
import { fetchOrder, validSignature, type RazorpayPayment } from "../razorpay";
import { repo } from "../repo";

// Called by Razorpay directly on the API's own URL (not through the website). Mounted before
// express.json() because the signature is over the exact bytes Razorpay sent.
// Payment status is only ever set from Razorpay-verified data, never from a browser redirect.

export const webhookRoutes = Router();

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment_link?: { entity?: { id?: string; notes?: { lead_id?: string } } };
    payment?: { entity?: RazorpayPayment };
  };
};

webhookRoutes.post("/razorpay", express.raw({ type: () => true, limit: "1mb" }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!validSignature(raw, req.get("x-razorpay-signature"))) {
    return void res.status(400).json({ error: "Invalid signature" });
  }
  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return void res.status(400).json({ error: "Invalid JSON" });
  }
  const pay = event.payload?.payment?.entity;

  if (event.event === "payment_link.paid") {
    // a link the team sent on WhatsApp
    const leadId = event.payload?.payment_link?.entity?.notes?.lead_id;
    const lead = leadId ? await repo().getLead(leadId) : null;
    if (lead && pay?.id && pay.amount) await recordOnlinePayment(lead, pay);
    else console.warn("[razorpay] paid link without a known lead", leadId, pay?.id);
  } else if (event.event === "payment.captured" && pay?.id && pay.order_id) {
    // checkout on /account; backs up the verify call in case the customer closed the page.
    // Payment-link payments also arrive here, without our lead_id on the order, and are skipped.
    const order = await fetchOrder(pay.order_id);
    const lead = order.notes?.lead_id ? await repo().getLead(order.notes.lead_id) : null;
    if (lead) await recordOnlinePayment(lead, pay);
  }
  // Other events are acknowledged so Razorpay doesn't retry them.
  res.json({ ok: true });
});
