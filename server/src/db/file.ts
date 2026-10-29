import { promises as fs } from "fs";
import path from "path";
import { buildDemoData } from "../demo";
import type { DB, Lead } from "../../../lib/types";
import type { Repo } from "../repo";
import { customerFields } from "./mappers";

// Local JSON store used when DATABASE_URL is not set (preview on a laptop).

const file = process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json");
let cache: DB | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<DB> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(file, "utf8")) as DB;
  } catch {
    cache = buildDemoData();
    await persist();
  }
  return cache;
}

async function persist() {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(cache));
}

/** Serialised read-modify-write so concurrent requests don't clobber each other. */
function mutate<T>(fn: (db: DB) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = fn(db);
    await persist();
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const fileRepo: Repo = {
  load: read,

  addEvents: (events, session) =>
    mutate((db) => {
      if (session && !db.sessions.some((s) => s.id === session.id)) db.sessions.push(session);
      db.events.push(...events);
    }),

  submitLead: (fields, planPrice, meta) =>
    mutate((db) => {
      const now = new Date().toISOString();
      const dayAgo = Date.now() - 86400000;
      const existing = db.leads.find(
        (l) =>
          !l.demo && l.mobile === fields.mobile && l.vehicle === fields.vehicle && (l.service ?? "subscription") === fields.service && Date.parse(l.createdAt) > dayAgo,
      );
      const customer = customerFields(meta);
      let lead: Lead;
      if (existing) {
        Object.assign(existing, fields, customer, { planPrice });
        existing.teamNotes.push({ at: now, text: "Customer re-submitted the booking form (details updated)." });
        lead = existing;
      } else {
        lead = {
          ...fields,
          ...customer,
          id: crypto.randomUUID(),
          ref: "CK-" + db.seq++,
          createdAt: now,
          planPrice,
          status: "new",
          history: [{ at: now, to: "new" }],
          teamNotes: [],
          visitorId: meta.visitorId,
          firstTouch: meta.first,
          lastTouch: meta.last,
          device: meta.device,
          inApp: meta.inApp,
        };
        db.leads.push(lead);
      }
      if (meta.visitorId && meta.sessionId) {
        db.events.push({
          at: now,
          visitorId: meta.visitorId,
          sessionId: meta.sessionId,
          name: "lead_submitted",
          props: { vehicle: fields.vehicle, price: planPrice, duplicate: !!existing },
          path: "/book",
          leadId: lead.id,
        });
      }
      return { id: lead.id, ref: lead.ref, duplicate: !!existing };
    }),

  setStatus: (id, to, note) =>
    mutate((db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (!lead || lead.status === to) return;
      const now = new Date().toISOString();
      lead.history.push({ at: now, from: lead.status, to, note });
      lead.status = to;
      if (to === "lost" || to === "cancelled") lead.lostReason = note || lead.lostReason;
      if (lead.visitorId) db.events.push({ at: now, visitorId: lead.visitorId, sessionId: "server", name: "lead_status_changed", props: { to }, leadId: id });
    }),

  getLead: async (id) => (await read()).leads.find((l) => l.id === id) ?? null,

  savePaymentLink: async (id, link) => {
    const lead = await mutate((db) => {
      const l = db.leads.find((x) => x.id === id);
      if (l) Object.assign(l, { paymentLinkId: link.id, paymentLinkUrl: link.url });
      return l;
    });
    if (lead && lead.status !== "active") await fileRepo.setStatus(id, "payment_link_sent");
  },

  recordPayment: async (p) => {
    const recorded = await mutate((db) => {
      if (p.razorpayPaymentId && db.payments.some((x) => x.razorpayPaymentId === p.razorpayPaymentId)) return false;
      db.payments.push({ ...p, id: crypto.randomUUID() });
      const l = db.leads.find((x) => x.id === p.leadId);
      if (l && p.status === "captured") {
        delete l.paymentLinkId;
        delete l.paymentLinkUrl;
      }
      return true;
    });
    if (recorded && p.status === "captured") await fileRepo.setStatus(p.leadId, "active", "Paid online (Razorpay)");
    return recorded;
  },

  addNote: (id, text) =>
    mutate((db) => {
      db.leads.find((l) => l.id === id)?.teamNotes.push({ at: new Date().toISOString(), text });
    }),

  clearDemo: () =>
    mutate((db) => {
      db.leads = db.leads.filter((l) => !l.demo);
      db.events = db.events.filter((e) => !e.demo);
      db.sessions = db.sessions.filter((s) => !s.demo);
      db.payments = db.payments.filter((p) => !p.demo);
    }),

  loadDemo: (demo) =>
    mutate((db) => {
      db.leads = [...db.leads.filter((l) => !l.demo), ...demo.leads];
      db.events = [...db.events.filter((e) => !e.demo), ...demo.events].sort((a, b) => a.at.localeCompare(b.at));
      db.sessions = [...db.sessions.filter((s) => !s.demo), ...demo.sessions];
      db.payments = [...db.payments.filter((p) => !p.demo), ...demo.payments];
    }),

  getSettings: async () => (await read()).settings || {},

  saveSettings: (settings) =>
    mutate((db) => {
      db.settings = settings;
    }),

  customerBookings: async (uid) => {
    const db = await read();
    return db.leads
      .filter((l) => !l.demo && l.customerUid === uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map((lead) => ({ lead, payments: db.payments.filter((p) => p.leadId === lead.id) }));
  },

  listTeam: async () => [...((await read()).team || [])],

  getTeamMember: async (email) => (await read()).team?.find((m) => m.email === email) ?? null,

  saveTeamMember: ({ email, role, addedBy }) =>
    mutate((db) => {
      db.team ??= [];
      const m = db.team.find((x) => x.email === email);
      if (m) m.role = role;
      else db.team.push({ email, role, addedBy, createdAt: new Date().toISOString() });
    }),

  removeTeamMember: (email) =>
    mutate((db) => {
      db.team = (db.team || []).filter((m) => m.email !== email);
    }),

  touchTeamMember: (email, name) =>
    mutate((db) => {
      const m = db.team?.find((x) => x.email === email);
      if (m) Object.assign(m, { lastLoginAt: new Date().toISOString() }, name ? { name } : {});
    }),
};
