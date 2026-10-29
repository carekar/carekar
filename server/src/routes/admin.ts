import { Router } from "express";
import { plans } from "../../../lib/site";
import { leadStatuses, type LeadStatus, type Settings } from "../../../lib/types";
import { requireAdmin, requireRole, startSession, superAdmins } from "../auth";
import { buildDemoData } from "../demo";
import { createPaymentLink, razorpayConfigured } from "../razorpay";
import { repo } from "../repo";

// Team endpoints for the website's /admin pages. Viewers can read everything; changes need
// editor access; managing the team needs the super admin.

export const adminRoutes = Router();

/** Google login for the dashboard: Firebase ID token in, 30-day session token out. */
adminRoutes.post("/session", async (req, res) => {
  const result = await startSession(String(req.body?.idToken || ""));
  if (!("token" in result)) return void res.status(result.status ?? 401).json({ error: result.error });
  res.json(result);
});

adminRoutes.use(requireAdmin);
const editor = requireRole("editor");
const superAdmin = requireRole("super_admin");

adminRoutes.get("/me", (req, res) => {
  res.json(req.admin);
});

/** Everything the dashboard needs. */
adminRoutes.get("/data", async (_req, res) => {
  res.json(await repo().load());
});

adminRoutes.post("/leads/:id/status", editor, async (req, res) => {
  const to = String(req.body?.status) as LeadStatus;
  const note = String(req.body?.note || "").slice(0, 80) || undefined;
  if (!leadStatuses.includes(to)) return void res.status(422).json({ error: "Unknown status" });
  await repo().setStatus(String(req.params.id), to, note);
  res.status(204).end();
});

/** Creates a Razorpay payment link for the amount due and moves the lead to "payment link sent". */
adminRoutes.post("/leads/:id/payment-link", editor, async (req, res) => {
  if (!razorpayConfigured()) {
    return void res.status(503).json({ error: "Razorpay isn't connected yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the API server (Render)." });
  }
  const lead = await repo().getLead(String(req.params.id));
  if (!lead) return void res.status(404).json({ error: "Lead not found" });
  const link = await createPaymentLink(lead);
  await repo().savePaymentLink(lead.id, link);
  res.json(link);
});

adminRoutes.post("/leads/:id/notes", editor, async (req, res) => {
  const text = String(req.body?.text || "").trim().slice(0, 500);
  if (!text) return void res.status(422).json({ error: "Note is empty" });
  await repo().addNote(String(req.params.id), text);
  res.status(204).end();
});

const digits10 = (v: unknown) => {
  const s = String(v || "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(s) ? s : undefined;
};

adminRoutes.put("/settings", editor, async (req, res) => {
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

adminRoutes.post("/demo/clear", editor, async (_req, res) => {
  await repo().clearDemo();
  res.status(204).end();
});

adminRoutes.post("/demo/restore", editor, async (_req, res) => {
  await repo().loadDemo(buildDemoData());
  res.status(204).end();
});

// ── Team (super admin only) ───────────────────────────────────

const GOOGLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

adminRoutes.get("/team", superAdmin, async (_req, res) => {
  res.json({ superAdmins: superAdmins(), members: await repo().listTeam() });
});

adminRoutes.put("/team", superAdmin, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 120);
  const role = req.body?.role;
  if (!GOOGLE_EMAIL.test(email)) return void res.status(422).json({ error: "Enter a valid Google (Gmail) address" });
  if (role !== "viewer" && role !== "editor") return void res.status(422).json({ error: "Choose viewer or editor" });
  if (superAdmins().includes(email)) return void res.status(422).json({ error: "That account is already the super admin" });
  await repo().saveTeamMember({ email, role, addedBy: req.admin!.email });
  res.status(204).end();
});

adminRoutes.delete("/team/:email", superAdmin, async (req, res) => {
  await repo().removeTeamMember(String(req.params.email).toLowerCase());
  res.status(204).end();
});
