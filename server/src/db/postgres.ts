import { prisma } from "./client";
import { customerFields, eventData, eventFromRow, leadData, leadFromRow, paymentData, paymentFromRow, sessionData, sessionFromRow } from "./mappers";
import type { Prisma } from "../generated/prisma/client";
import type { Repo } from "../repo";
import type { DB, Lead, Settings } from "../../../lib/types";

// Supabase Postgres backend, through Prisma (schema: prisma/schema.prisma).

const EVENT_HISTORY_DAYS = 185; // covers a 90-day range plus its comparison period
const CHUNK = 1000;

async function inChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

async function leadById(id: string) {
  const row = await prisma().lead.findUnique({ where: { id } });
  return row ? leadFromRow(row) : null;
}

export const postgresRepo: Repo = {
  async load() {
    const db = prisma();
    const since = new Date(Date.now() - EVENT_HISTORY_DAYS * 86400000);
    const [leads, events, sessions, payments, settings] = await Promise.all([
      db.lead.findMany({ orderBy: { createdAt: "asc" } }),
      db.event.findMany({ where: { at: { gte: since } }, orderBy: { at: "asc" } }),
      db.session.findMany({ where: { startedAt: { gte: since } }, orderBy: { startedAt: "asc" } }),
      db.payment.findMany({ orderBy: { at: "asc" } }),
      postgresRepo.getSettings(),
    ]);
    return {
      leads: leads.map(leadFromRow),
      events: events.map(eventFromRow),
      sessions: sessions.map(sessionFromRow),
      payments: payments.map(paymentFromRow),
      settings,
      seq: 0,
    } satisfies DB;
  },

  async addEvents(events, session) {
    const db = prisma();
    if (session) await db.session.createMany({ data: [sessionData(session)], skipDuplicates: true });
    if (events.length) await db.event.createMany({ data: events.map(eventData) });
  },

  async submitLead(fields, planPrice, meta) {
    const db = prisma();
    const now = new Date().toISOString();
    const existing = await db.lead.findFirst({
      where: { mobile: fields.mobile, vehicle: fields.vehicle, demo: false, createdAt: { gt: new Date(Date.now() - 86400000) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, ref: true, teamNotes: true },
    });

    const customer = customerFields(meta);
    let lead: { id: string; ref: string };
    if (existing) {
      const teamNotes = [...(existing.teamNotes as Lead["teamNotes"]), { at: now, text: "Customer re-submitted the booking form (details updated)." }];
      await db.lead.update({ where: { id: existing.id }, data: leadData({ ...fields, ...customer, planPrice, teamNotes }) });
      lead = existing;
    } else {
      lead = await db.lead.create({
        data: leadData({
          ...fields,
          ...customer,
          planPrice,
          status: "new",
          history: [{ at: now, to: "new" }],
          teamNotes: [],
          visitorId: meta.visitorId,
          firstTouch: meta.first,
          lastTouch: meta.last,
          device: meta.device,
          inApp: meta.inApp,
        }) as Prisma.LeadCreateInput,
        select: { id: true, ref: true },
      });
    }
    if (meta.visitorId && meta.sessionId) {
      await postgresRepo.addEvents([{
        at: now,
        visitorId: meta.visitorId,
        sessionId: meta.sessionId,
        name: "lead_submitted",
        props: { vehicle: fields.vehicle, price: planPrice, duplicate: !!existing },
        path: "/book",
        leadId: lead.id,
      }]);
    }
    return { id: lead.id, ref: lead.ref, duplicate: !!existing };
  },

  async setStatus(id, to, note) {
    const lead = await leadById(id);
    if (!lead || lead.status === to) return;
    const now = new Date().toISOString();
    const patch: Partial<Lead> = { status: to, history: [...lead.history, { at: now, from: lead.status, to, note }] };
    if ((to === "lost" || to === "cancelled") && note) patch.lostReason = note;
    await prisma().lead.update({ where: { id }, data: leadData(patch) });
    if (lead.visitorId) {
      await postgresRepo.addEvents([{ at: now, visitorId: lead.visitorId, sessionId: "server", name: "lead_status_changed", props: { to }, leadId: id }]);
    }
  },

  async addNote(id, text) {
    const lead = await leadById(id);
    if (!lead) return;
    const teamNotes = [...lead.teamNotes, { at: new Date().toISOString(), text }];
    await prisma().lead.update({ where: { id }, data: leadData({ teamNotes }) });
  },

  async clearDemo() {
    const db = prisma();
    // payments cascade from leads
    await db.$transaction([
      db.event.deleteMany({ where: { demo: true } }),
      db.session.deleteMany({ where: { demo: true } }),
      db.lead.deleteMany({ where: { demo: true } }),
    ]);
  },

  async loadDemo(demo) {
    const db = prisma();
    await postgresRepo.clearDemo();
    await inChunks(demo.leads, (c) => db.lead.createMany({ data: c.map((l) => leadData(l) as Prisma.LeadCreateManyInput) }));
    await inChunks(demo.payments, (c) => db.payment.createMany({ data: c.map(paymentData) }));
    await inChunks(demo.sessions, (c) => db.session.createMany({ data: c.map(sessionData) }));
    await inChunks(demo.events, (c) => db.event.createMany({ data: c.map(eventData) }));
  },

  async getSettings() {
    const row = await prisma().setting.findUnique({ where: { key: "site" } });
    return (row?.value as Settings | undefined) || {};
  },

  async saveSettings(settings) {
    const value = settings as Prisma.InputJsonValue;
    await prisma().setting.upsert({ where: { key: "site" }, create: { key: "site", value }, update: { value } });
  },
};
