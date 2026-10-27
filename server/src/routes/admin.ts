import { Router } from "express";
import { plans } from "../../../lib/site";
import { leadStatuses, type LeadStatus, type Settings } from "../../../lib/types";
import { ownerOnly, requireAdmin } from "../auth";
import { buildDemoData } from "../demo";
import { repo } from "../repo";

// Team endpoints for the website's /admin pages. Every route needs a logged-in team member;
// payments, settings and demo data are owner-only.

export const adminRoutes = Router();
adminRoutes.use(requireAdmin);

adminRoutes.get("/me", (req, res) => {
  res.json(req.admin);
});

/** Everything the dashboard needs. Staff don't get payments (revenue is owner-only). */
adminRoutes.get("/data", async (req, res) => {
  const db = await repo().load();
  if (req.admin!.role !== "owner") db.payments = [];
  res.json(db);
});

adminRoutes.post("/leads/:id/status", async (req, res) => {
  const to = String(req.body?.status) as LeadStatus;
  const note = String(req.body?.note || "").slice(0, 80) || undefined;
  if (!leadStatuses.includes(to)) return void res.status(422).json({ error: "Unknown status" });
  await repo().setStatus(req.params.id, to, note);
  res.status(204).end();
});

adminRoutes.post("/leads/:id/notes", async (req, res) => {
  const text = String(req.body?.text || "").trim().slice(0, 500);
  if (!text) return void res.status(422).json({ error: "Note is empty" });
  await repo().addNote(req.params.id, text);
  res.status(204).end();
});

const digits10 = (v: unknown) => {
  const s = String(v || "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(s) ? s : undefined;
};

adminRoutes.put("/settings", ownerOnly, async (req, res) => {
  const b = (req.body || {}) as {
    phone?: string;
    whatsapp?: string;
    email?: string;
    prices?: Record<string, unknown>;
    hiddenPlans?: unknown[];
    oneTimePrice?: unknown;
    oneTimeHidden?: unknown;
    societies?: unknown[];
  };
  const oneTimePrice = Number(b.oneTimePrice);
  const settings: Settings = {
    contact: { phone: digits10(b.phone), whatsapp: digits10(b.whatsapp), email: String(b.email || "").trim().slice(0, 80) },
    prices: {},
    hiddenPlans: [],
    oneTime: {
      price: Number.isInteger(oneTimePrice) && oneTimePrice >= 1 && oneTimePrice <= 100000 ? oneTimePrice : undefined,
      hidden: !!b.oneTimeHidden,
    },
    societies: (Array.isArray(b.societies) ? b.societies : [])
      .map((s) => String(s).trim().slice(0, 80))
      .filter((s, i, a) => s && a.indexOf(s) === i)
      .slice(0, 300),
  };
  for (const p of plans) {
    const price = Number(b.prices?.[p.vehicle]);
    if (Number.isInteger(price) && price >= 1 && price <= 100000) settings.prices![p.vehicle] = price;
    if (b.hiddenPlans?.includes(p.vehicle)) settings.hiddenPlans!.push(p.vehicle);
  }
  await repo().saveSettings(settings);
  res.status(204).end();
});

adminRoutes.post("/demo/clear", ownerOnly, async (_req, res) => {
  await repo().clearDemo();
  res.status(204).end();
});

adminRoutes.post("/demo/restore", ownerOnly, async (_req, res) => {
  await repo().loadDemo(buildDemoData());
  res.status(204).end();
});
