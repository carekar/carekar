import { Router } from "express";
import { leadSchema } from "../../../lib/validation";
import { findPlan } from "../../../lib/config";
import type { LeadMeta, Session, TrackEvent } from "../../../lib/types";
import { repo } from "../repo";
import { getConfig } from "../settings";
import { notifyNewLead } from "../notify";
import { customerFromToken } from "../customer";

// Public endpoints used by the website: site config, funnel events, booking form.

export const publicRoutes = Router();

publicRoutes.get("/config", async (_req, res) => {
  res.set("Cache-Control", "public, max-age=30");
  res.json(await getConfig());
});

// ── Funnel events ────────────────────────────────────────────

const NAME = /^[a-z_]{2,40}$/;
const BOT = /bot|crawler|spider|lighthouse|headless|preview/i;

type Incoming = { name: string; props?: TrackEvent["props"]; path?: string; at?: string };

publicRoutes.post("/events", async (req, res) => {
  if (BOT.test(req.get("user-agent") || "")) return void res.status(204).end();

  // sendBeacon posts text/plain, so the body arrives as a string
  let body: { visitorId?: string; sessionId?: string; events?: Incoming[] };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return void res.status(400).end();
  }
  const visitorId = body.visitorId?.slice(0, 40);
  const sessionId = body.sessionId?.slice(0, 40);
  const events = (body.events || []).slice(0, 50).filter((e) => NAME.test(e?.name));
  if (!visitorId || !sessionId || !events.length) return void res.status(204).end();

  const now = new Date().toISOString();
  let session: Session | undefined;
  const rows: TrackEvent[] = events.map((e) => {
    const props = sanitize(e.props);
    if (e.name === "session_start") {
      session = {
        id: sessionId,
        visitorId,
        startedAt: now,
        channel: str(props.channel) || "Direct",
        source: str(props.source),
        medium: str(props.medium),
        campaign: str(props.campaign),
        content: str(props.content),
        landing: str(props.landing),
        referrer: str(props.referrer),
        device: str(props.device) || "mobile",
        os: str(props.os),
        browser: str(props.browser),
        inApp: str(props.inApp),
        returning: props.returning === true,
      };
    }
    return { at: now, visitorId, sessionId, name: e.name, props, path: e.path?.slice(0, 100) };
  });
  try {
    await repo().addEvents(rows, session);
  } catch (err) {
    console.error("[events]", err);
  }
  res.status(204).end();
});

function sanitize(p: Incoming["props"]) {
  const out: NonNullable<TrackEvent["props"]> = {};
  if (!p || typeof p !== "object") return out;
  for (const [k, v] of Object.entries(p).slice(0, 20)) {
    if (typeof v === "string") out[k.slice(0, 30)] = v.slice(0, 120);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k.slice(0, 30)] = v;
  }
  return out;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

// ── Booking form ─────────────────────────────────────────────

const hits = new Map<string, number[]>();
const WINDOW = 10 * 60 * 1000;

function rateLimited(key: string, max: number) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

publicRoutes.post("/leads", async (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>;

  // Honeypot: real users never fill this hidden field
  if (body.company) return void res.json({ ref: "CK-0000" });

  if (rateLimited("ip:" + (req.ip || "local"), 8)) {
    return void res.status(429).json({ error: "Too many requests. Please try again in a few minutes or WhatsApp us." });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({ error: "Please check your details", fields: parsed.error.flatten().fieldErrors });
  }
  const { consent: _consent, ...fields } = parsed.data;

  // Confirming a booking needs a Google login (Firebase). A callback request doesn't.
  const customer = await customerFromToken(req.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!customer && !fields.callbackRequested) {
    return void res.status(401).json({ error: "Please log in with Google to confirm your booking.", login: true });
  }

  const plan = findPlan(await getConfig(), fields.vehicle)!;
  const meta = (body.meta || {}) as LeadMeta;
  const clean: LeadMeta = {
    customer: customer ?? undefined,
    visitorId: meta.visitorId?.slice(0, 40),
    sessionId: meta.sessionId?.slice(0, 40),
    first: meta.first,
    last: meta.last,
    device: meta.device?.slice(0, 20),
    inApp: meta.inApp?.slice(0, 20),
  };

  let result;
  try {
    result = await repo().submitLead(fields, plan.price, clean);
  } catch (err) {
    console.error("[leads]", err);
    return void res.status(500).json({ error: "Something went wrong. Please WhatsApp or call us." });
  }

  if (!result.duplicate) await notifyNewLead({ ...fields, ref: result.ref, id: result.id, price: plan.price, planLabel: plan.label, channel: clean.first?.channel });
  res.json({ ref: result.ref, id: result.id });
});
