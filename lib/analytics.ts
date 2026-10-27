import "server-only";
import type { DB, Lead, LeadStatus, Session, TrackEvent } from "./types";
import { plans } from "./site";

// Funnel & business analytics computed from the store (plan.md §10).
// Phase 2 moves the heavy aggregations into Postgres views.

export type Range = { from: number; to: number; days: number };
export type Filters = { channel?: string; device?: string; campaign?: string };

export function makeRange(days: number): Range {
  const to = Date.now();
  return { from: to - days * 86400000, to, days };
}
export const previousRange = (r: Range): Range => ({ from: r.from - (r.to - r.from), to: r.from, days: r.days });

const inRange = (iso: string, r: Range) => {
  const t = Date.parse(iso);
  return t >= r.from && t < r.to;
};

const IST = 5.5 * 3600000;
export const istHour = (iso: string) => new Date(Date.parse(iso) + IST).getUTCHours();
export const istDay = (iso: string) => new Date(Date.parse(iso) + IST).toISOString().slice(0, 10);

const statusOrder: LeadStatus[] = ["new", "contacted", "availability_confirmed", "payment_link_sent", "active"];
export const reached = (l: Lead, s: LeadStatus) => l.history.some((h) => h.to === s || statusOrder.indexOf(h.to) > statusOrder.indexOf(s));

/** Sessions in range (with filters) and the visitor → first-session map used for attribution. */
function scope(db: DB, r: Range, f: Filters) {
  const sessions = db.sessions.filter(
    (s) => inRange(s.startedAt, r) && (!f.channel || s.channel === f.channel) && (!f.device || s.device === f.device) && (!f.campaign || s.campaign === f.campaign),
  );
  const visitorSession = new Map<string, Session>();
  for (const s of sessions) if (!visitorSession.has(s.visitorId)) visitorSession.set(s.visitorId, s);
  const events = db.events.filter((e) => visitorSession.has(e.visitorId) && inRange(e.at, r));
  const leadIds = new Set(events.filter((e) => e.name === "lead_submitted" && e.leadId).map((e) => e.leadId!));
  const leads = db.leads.filter((l) => leadIds.has(l.id));
  return { sessions, visitorSession, events, leads };
}

export type FunnelStep = { key: string; label: string; count: number; group: "website" | "sales" };

export function businessFunnel(db: DB, r: Range, f: Filters = {}): FunnelStep[] {
  const { visitorSession, events, leads } = scope(db, r, f);
  const byName = new Map<string, Set<string>>();
  for (const e of events) {
    if (!byName.has(e.name)) byName.set(e.name, new Set());
    byName.get(e.name)!.add(e.visitorId);
  }
  const has = (...names: string[]) => {
    const s = new Set<string>();
    for (const n of names) byName.get(n)?.forEach((v) => s.add(v));
    return s;
  };
  const chain: [string, string, Set<string>][] = [
    ["visited", "Visited site", new Set(visitorSession.keys())],
    ["engaged", "Engaged (scroll/tap)", has("engaged")],
    ["vehicle", "Selected vehicle", has("vehicle_selected")],
    ["plan", "Viewed plan & price", has("plan_viewed")],
    ["book", "Opened booking form", has("book_clicked", "form_opened")],
    ["started", "Started form", has("form_started")],
    ["submitted", "Submitted lead", has("lead_submitted")],
  ];
  const steps: FunnelStep[] = [];
  let prev: Set<string> | null = null;
  for (const [key, label, set] of chain) {
    const cur: Set<string> = prev ? new Set([...set].filter((v) => prev!.has(v))) : set;
    steps.push({ key, label, count: cur.size, group: "website" });
    prev = cur;
  }
  const submitted = steps[steps.length - 1].count;
  const leadCount = Math.max(submitted, leads.length);
  steps[steps.length - 1].count = leadCount;
  const salesSteps: [string, string, LeadStatus][] = [
    ["contacted", "Contacted by team", "contacted"],
    ["confirmed", "Availability confirmed", "availability_confirmed"],
    ["link", "Payment link sent", "payment_link_sent"],
    ["paid", "Paid · subscription active", "active"],
  ];
  for (const [key, label, s] of salesSteps) steps.push({ key, label, count: leads.filter((l) => reached(l, s)).length, group: "sales" });
  return steps;
}

export function dailySeries(db: DB, r: Range) {
  const days: { day: string; visitors: number; leads: number; paid: number }[] = [];
  const idx = new Map<string, number>();
  for (let t = r.from; t < r.to; t += 86400000) {
    const d = istDay(new Date(t).toISOString());
    if (!idx.has(d)) {
      idx.set(d, days.length);
      days.push({ day: d, visitors: 0, leads: 0, paid: 0 });
    }
  }
  const seen = new Set<string>();
  for (const s of db.sessions) {
    if (!inRange(s.startedAt, r)) continue;
    const k = istDay(s.startedAt) + s.visitorId;
    if (seen.has(k)) continue;
    seen.add(k);
    const i = idx.get(istDay(s.startedAt));
    if (i !== undefined) days[i].visitors++;
  }
  for (const l of db.leads) {
    if (!inRange(l.createdAt, r)) continue;
    const i = idx.get(istDay(l.createdAt));
    if (i !== undefined) days[i].leads++;
  }
  for (const p of db.payments) {
    if (p.status !== "captured" || !inRange(p.at, r)) continue;
    const i = idx.get(istDay(p.at));
    if (i !== undefined) days[i].paid += p.amount;
  }
  return days;
}

export function overviewKpis(db: DB, r: Range) {
  const leads = db.leads.filter((l) => inRange(l.createdAt, r));
  const visitors = new Set(db.sessions.filter((s) => inRange(s.startedAt, r)).map((s) => s.visitorId)).size;
  const paidLeads = leads.filter((l) => reached(l, "active")).length;
  const revenue = db.payments.filter((p) => p.status === "captured" && inRange(p.at, r)).reduce((s, p) => s + p.amount, 0);
  return {
    visitors,
    leads: leads.length,
    leadRate: visitors ? leads.length / visitors : 0,
    paid: paidLeads,
    paidRate: leads.length ? paidLeads / leads.length : 0,
    revenue,
  };
}

export function subscriptionStats(db: DB) {
  const active = db.leads.filter((l) => l.status === "active");
  const mrr = active.reduce((s, l) => s + l.planPrice * (l.vehicleCount || 1), 0);
  return { active: active.length, mrr };
}

export function needsAction(db: DB) {
  const now = Date.now();
  const stale = db.leads.filter((l) => l.status === "new" && now - Date.parse(l.createdAt) > 2 * 3600000);
  const fresh = db.leads.filter((l) => l.status === "new" && now - Date.parse(l.createdAt) <= 2 * 3600000);
  const awaitingCheck = db.leads.filter((l) => l.status === "contacted");
  const awaitingPayment = db.leads.filter((l) => l.status === "payment_link_sent");
  const failed = db.payments.filter((p) => p.status === "failed" && now - Date.parse(p.at) < 7 * 86400000);
  const lastLead = db.leads.reduce((m, l) => Math.max(m, Date.parse(l.createdAt)), 0);
  return { stale, fresh, awaitingCheck, awaitingPayment, failed, noLeads24h: now - lastLead > 86400000 };
}

/** Group visitors → leads → paid by a session dimension. */
export function breakdown(db: DB, r: Range, dim: "channel" | "device" | "browser" | "campaign" | "landing", f: Filters = {}) {
  const { visitorSession, leads } = scope(db, r, f);
  const rows = new Map<string, { key: string; visitors: number; leads: number; paid: number; revenue: number }>();
  const row = (k: string) => {
    if (!rows.has(k)) rows.set(k, { key: k, visitors: 0, leads: 0, paid: 0, revenue: 0 });
    return rows.get(k)!;
  };
  for (const s of visitorSession.values()) row((s[dim] as string) || "(none)").visitors++;
  for (const l of leads) {
    const s = l.visitorId ? visitorSession.get(l.visitorId) : undefined;
    const k = (s?.[dim] as string) || "(none)";
    row(k).leads++;
    if (reached(l, "active")) {
      row(k).paid++;
      row(k).revenue += l.planPrice;
    }
  }
  return [...rows.values()].sort((a, b) => b.visitors - a.visitors);
}

export function vehicleBreakdown(db: DB, r: Range, f: Filters = {}) {
  const { events, leads } = scope(db, r, f);
  return plans.map((p) => {
    const viewed = new Set(events.filter((e) => e.name === "plan_viewed" && e.props?.vehicle === p.vehicle).map((e) => e.visitorId)).size;
    const l = leads.filter((x) => x.vehicle === p.vehicle);
    const paid = l.filter((x) => reached(x, "active")).length;
    return { key: p.label, viewed, leads: l.length, paid, revenue: paid * p.price };
  });
}

export function societyBreakdown(db: DB, r: Range) {
  const rows = new Map<string, { key: string; leads: number; active: number; notServiceable: number }>();
  for (const l of db.leads) {
    if (!inRange(l.createdAt, r)) continue;
    const k = l.society.trim();
    if (!rows.has(k)) rows.set(k, { key: k, leads: 0, active: 0, notServiceable: 0 });
    const x = rows.get(k)!;
    x.leads++;
    if (l.status === "active") x.active++;
    if (l.status === "not_serviceable") x.notServiceable++;
  }
  return [...rows.values()].sort((a, b) => b.leads - a.leads);
}

export function hourOfDay(db: DB, r: Range) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, visitors: 0, leads: 0 }));
  for (const s of db.sessions) if (inRange(s.startedAt, r)) hours[istHour(s.startedAt)].visitors++;
  for (const l of db.leads) if (inRange(l.createdAt, r)) hours[istHour(l.createdAt)].leads++;
  return hours;
}

export function formAnalytics(db: DB, r: Range, f: Filters = {}) {
  const { events } = scope(db, r, f);
  const uniq = (pred: (e: TrackEvent) => boolean) => new Set(events.filter(pred).map((e) => e.visitorId)).size;
  const durations = (step: number) => {
    const d = events.filter((e) => e.name === "form_step_completed" && e.props?.step === step).map((e) => Number(e.props?.duration_ms) || 0).sort((a, b) => a - b);
    return d.length ? d[Math.floor(d.length / 2)] : 0;
  };
  const steps = [
    { label: "Opened form", count: uniq((e) => e.name === "form_opened" || e.name === "book_clicked"), median: 0 },
    { label: "Started filling", count: uniq((e) => e.name === "form_started"), median: 0 },
    { label: "Step 1 · Vehicle", count: uniq((e) => e.name === "form_step_completed" && e.props?.step === 1), median: durations(1) },
    { label: "Step 2 · Your details", count: uniq((e) => e.name === "form_step_completed" && e.props?.step === 2), median: durations(2) },
    { label: "Step 3 · Location", count: uniq((e) => e.name === "form_step_completed" && e.props?.step === 3), median: durations(3) },
    { label: "Step 4 · Schedule", count: uniq((e) => e.name === "form_step_completed" && e.props?.step === 4), median: durations(4) },
    { label: "Submitted", count: uniq((e) => e.name === "lead_submitted"), median: 0 },
  ];
  const count = (key: string, list: TrackEvent[]) => {
    const m = new Map<string, number>();
    for (const e of list) {
      const k = String(e.props?.[key] ?? "(unknown)");
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const abandoned = events.filter((e) => e.name === "form_abandoned");
  return {
    steps,
    abandonByStep: count("last_step", abandoned),
    abandonByField: count("last_field", abandoned),
    fieldErrors: count("field", events.filter((e) => e.name === "form_field_error")),
    prefilled: {
      yes: uniq((e) => e.name === "form_opened" && e.props?.prefilled === true),
      no: uniq((e) => e.name === "form_opened" && e.props?.prefilled === false),
    },
    notListed: events.filter((e) => e.name === "society_not_listed").length,
    abandoned: abandoned.slice(-40).reverse(),
  };
}

export function contactClicks(db: DB, r: Range) {
  const m = new Map<string, { location: string; whatsapp: number; call: number; book: number }>();
  for (const e of db.events) {
    if (!inRange(e.at, r) || !["whatsapp_clicked", "call_clicked", "book_clicked"].includes(e.name)) continue;
    const k = String(e.props?.location ?? "unknown");
    if (!m.has(k)) m.set(k, { location: k, whatsapp: 0, call: 0, book: 0 });
    const x = m.get(k)!;
    if (e.name === "whatsapp_clicked") x.whatsapp++;
    else if (e.name === "call_clicked") x.call++;
    else x.book++;
  }
  return [...m.values()].sort((a, b) => b.book + b.whatsapp - (a.book + a.whatsapp));
}

const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

export function salesFunnel(db: DB, r: Range) {
  const leads = db.leads.filter((l) => inRange(l.createdAt, r));
  const gap = (l: Lead, from: LeadStatus, to: LeadStatus) => {
    const a = l.history.find((h) => h.to === from);
    const b = l.history.find((h) => h.to === to);
    return a && b ? (Date.parse(b.at) - Date.parse(a.at)) / 3600000 : null;
  };
  const times = (from: LeadStatus, to: LeadStatus) => median(leads.map((l) => gap(l, from, to)).filter((x): x is number => x !== null));
  const reasons = new Map<string, number>();
  for (const l of leads) if (l.status === "lost") reasons.set(l.lostReason || "Not specified", (reasons.get(l.lostReason || "Not specified") || 0) + 1);
  const statusCounts = new Map<LeadStatus, number>();
  for (const l of leads) statusCounts.set(l.status, (statusCounts.get(l.status) || 0) + 1);
  return {
    total: leads.length,
    times: {
      firstResponse: times("new", "contacted"),
      confirmation: times("contacted", "availability_confirmed"),
      payment: times("payment_link_sent", "active"),
    },
    lostReasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
    statusCounts,
    callbackRate: leads.length ? leads.filter((l) => l.callbackRequested).length / leads.length : 0,
  };
}

export function paymentStats(db: DB, r: Range) {
  const pays = db.payments.filter((p) => inRange(p.at, r));
  const captured = pays.filter((p) => p.status === "captured");
  const byMethod = new Map<string, { method: string; count: number; amount: number; failed: number }>();
  for (const p of pays) {
    if (!byMethod.has(p.method)) byMethod.set(p.method, { method: p.method, count: 0, amount: 0, failed: 0 });
    const m = byMethod.get(p.method)!;
    if (p.status === "captured") {
      m.count++;
      m.amount += p.amount;
    } else m.failed++;
  }
  return { pays, collected: captured.reduce((s, p) => s + p.amount, 0), count: captured.length, failed: pays.length - captured.length, byMethod: [...byMethod.values()] };
}

/** Monthly cohorts by first payment month: % still paying in following months. */
export function cohorts(db: DB) {
  const firstPay = new Map<string, number>();
  const paidMonths = new Map<string, Set<string>>();
  for (const p of db.payments) {
    if (p.status !== "captured") continue;
    const t = Date.parse(p.at);
    firstPay.set(p.leadId, Math.min(firstPay.get(p.leadId) ?? Infinity, t));
    if (!paidMonths.has(p.leadId)) paidMonths.set(p.leadId, new Set());
    paidMonths.get(p.leadId)!.add(p.at.slice(0, 7));
  }
  const groups = new Map<string, string[]>();
  for (const [lead, t] of firstPay) {
    const m = new Date(t).toISOString().slice(0, 7);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(lead);
  }
  const addMonth = (m: string, n: number) => {
    const d = new Date(m + "-01T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 7);
  };
  const nowM = new Date().toISOString().slice(0, 7);
  return [...groups.entries()].sort().map(([m, ids]) => ({
    month: m,
    size: ids.length,
    retained: [1, 2, 3].map((n) => (addMonth(m, n) > nowM ? null : ids.filter((id) => paidMonths.get(id)!.has(addMonth(m, n))).length / ids.length)),
  }));
}

export function journey(db: DB, visitorId?: string) {
  if (!visitorId) return { sessions: [] as Session[], events: [] as TrackEvent[] };
  return {
    sessions: db.sessions.filter((s) => s.visitorId === visitorId),
    events: db.events.filter((e) => e.visitorId === visitorId),
  };
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
