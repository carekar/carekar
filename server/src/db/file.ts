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
        (l) => !l.demo && l.mobile === fields.mobile && l.vehicle === fields.vehicle && Date.parse(l.createdAt) > dayAgo,
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
};
