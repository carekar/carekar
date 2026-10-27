import { Router, type NextFunction, type Request, type Response } from "express";
import type { CustomerBooking } from "../../../lib/types";
import { customerFromToken, type Customer } from "../customer";
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
  }));
  res.json({ customer: req.customer, bookings });
});
