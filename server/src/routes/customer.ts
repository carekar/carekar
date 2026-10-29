import { Router, type NextFunction, type Request, type Response } from "express";
import type { CustomerBooking, Lead, LeadStatus, Payment } from "../../../lib/types";
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

const unpaidStatuses: LeadStatus[] = ["new", "contacted", "availability_confirmed", "payment_link_sent"];

/** Customers pay when booking (or later, if that was cancelled), and again when the team sends a renewal link. */
const payable = (l: Lead, payments: Payment[]) =>
  !!l.paymentLinkUrl || (unpaidStatuses.includes(l.status) && !payments.some((p) => p.status === "captured"));

/** One of the logged-in customer's own bookings, by ref (CK-1001), with its payments. */
async function ownBooking(req: Request) {
  const rows = await repo().customerBookings(req.customer!.uid);
  return rows.find((r) => r.lead.ref === req.params.ref) ?? null;
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
    payable: razorpayConfigured() && payable(l, payments),
  }));
  res.json({ customer: req.customer, bookings });
});

/** Starts a checkout: a Razorpay order for the amount due on this booking. */
customerRoutes.post("/bookings/:ref/order", async (req, res) => {
  if (!razorpayConfigured()) {
    return void res.status(503).json({ error: "Online payment isn't available right now. Please use the payment link we send on WhatsApp." });
  }
  const own = await ownBooking(req);
  if (!own) return void res.status(404).json({ error: "Booking not found" });
  const { lead } = own;
  if (!payable(lead, own.payments)) return void res.status(409).json({ error: "This booking is already paid." });
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
  const lead = (await ownBooking(req))?.lead;
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
