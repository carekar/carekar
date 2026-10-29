import { Router, type NextFunction, type Request, type Response } from "express";
import type { CustomerBooking, Lead } from "../../../lib/types";
import { customerFromToken, type Customer } from "../customer";
import { recordOnlinePayment } from "../payments";
import { capturedPayment, createOrder, fetchOrder, publicKeyId, razorpayConfigured, validCheckoutSignature } from "../razorpay";
import { repo } from "../repo";

// Endpoints for logged-in customers (Google login on the website). The Firebase ID token
// comes as "Authorization: Bearer …"; customers only ever see their own bookings.

declare module "express-serve-static-core" {
  interface Request {
    customer?: Customer;
  }
}

async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const customer = await customerFromToken(req.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!customer) return void res.status(401).json({ error: "Please log in to see your bookings." });
  req.customer = customer;
  next();
}

/** Payment only after the team confirms availability, or when they've sent a renewal link. */
const payable = (l: Lead) => l.status === "availability_confirmed" || l.status === "payment_link_sent" || !!l.paymentLinkUrl;

/** One of the logged-in customer's own bookings, by ref (CK-1001). */
async function ownBooking(req: Request) {
  const rows = await repo().customerBookings(req.customer!.uid);
  return rows.find((r) => r.lead.ref === req.params.ref)?.lead ?? null;
}

export const customerRoutes = Router();
customerRoutes.use(requireCustomer);

customerRoutes.get("/bookings", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const rows = await repo().customerBookings(req.customer!.uid);
  const bookings: CustomerBooking[] = rows.map(({ lead: l, payments }) => ({
    ref: l.ref,
    createdAt: l.createdAt,
    service: l.service ?? "subscription",
    vehicle: l.vehicle,
    vehicleModel: l.vehicleModel,
    vehicleCount: l.vehicleCount,
    planPrice: l.planPrice,
    status: l.status,
    startDate: l.startDate,
    society: l.society,
    towerFlat: l.towerFlat,
    callbackRequested: l.callbackRequested,
    timeline: l.history.map((h) => ({ at: h.at, to: h.to })),
    payments: payments.map((p) => ({ amount: p.amount, status: p.status, at: p.at, method: p.method })),
    payable: razorpayConfigured() && payable(l),
  }));
  res.json({ customer: req.customer, bookings });
});

/** Starts a checkout: a Razorpay order for the amount due on this booking. */
customerRoutes.post("/bookings/:ref/order", async (req, res) => {
  if (!razorpayConfigured()) {
    return void res.status(503).json({ error: "Online payment isn't available right now. Please use the payment link we send on WhatsApp." });
  }
  const lead = await ownBooking(req);
  if (!lead) return void res.status(404).json({ error: "Booking not found" });
  if (!payable(lead)) return void res.status(409).json({ error: "There's nothing to pay for this booking right now." });
  const order = await createOrder(lead);
  res.json({
    ...order,
    keyId: publicKeyId(),
    prefill: { name: lead.name, contact: "+91" + lead.mobile, email: lead.customerEmail ?? req.customer!.email },
  });
});

/** Checkout success: checks Razorpay's signature, then records the payment. */
customerRoutes.post("/bookings/:ref/verify", async (req, res) => {
  const orderId = String(req.body?.razorpay_order_id || "");
  const paymentId = String(req.body?.razorpay_payment_id || "");
  const signature = String(req.body?.razorpay_signature || "");
  if (!orderId || !paymentId || !signature) return void res.status(400).json({ error: "Payment details are missing" });
  if (!validCheckoutSignature(orderId, paymentId, signature)) {
    return void res.status(400).json({ error: "We couldn't verify this payment" });
  }
  const lead = await ownBooking(req);
  if (!lead) return void res.status(404).json({ error: "Booking not found" });

  // the order must be one we created for this booking, and the payment must belong to it
  const order = await fetchOrder(orderId);
  if (order.notes?.lead_id !== lead.id) return void res.status(400).json({ error: "This payment is for a different booking" });
  const pay = await capturedPayment(paymentId);
  if (pay.order_id !== orderId || pay.status !== "captured") {
    return void res.status(400).json({ error: "Payment isn't complete yet. If money was deducted, it'll be confirmed shortly." });
  }
  await recordOnlinePayment(lead, pay);
  res.json({ ok: true });
});
