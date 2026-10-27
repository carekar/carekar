// Copies real (non-demo) leads, sessions, events, payments and settings from the local
// data/db.json into Postgres, then moves the CK-#### counter past the highest ref.
// Usage: npm run db:import            (add -- --with-demo to also copy demo data)
import { readFile } from "node:fs/promises";
import { prisma } from "../src/db/client";
import { eventData, leadData, paymentData, sessionData } from "../src/db/mappers";
import type { Prisma } from "../src/generated/prisma/client";
import type { DB } from "../../lib/types";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing in server/.env");

const withDemo = process.argv.includes("--with-demo");
const local = JSON.parse(await readFile(process.env.DATA_FILE || "data/db.json", "utf8")) as DB;
const db = prisma();
const keep = (r: { demo?: boolean }) => withDemo || !r.demo;

const leads = local.leads.filter(keep);
const leadIds = new Set(leads.map((l) => l.id));
const payments = local.payments.filter((p) => keep(p) && leadIds.has(p.leadId));
const sessions = local.sessions.filter(keep);

console.log("✓ leads:", (await db.lead.createMany({ data: leads.map((l) => leadData(l) as Prisma.LeadCreateManyInput), skipDuplicates: true })).count);
console.log("✓ payments:", (await db.payment.createMany({ data: payments.map(paymentData), skipDuplicates: true })).count);
console.log("✓ sessions:", (await db.session.createMany({ data: sessions.map(sessionData), skipDuplicates: true })).count);

// events have no natural key, so only import them into an empty table
const existing = await db.event.count();
if (existing) console.log(`• events: skipped (table already has ${existing} rows)`);
else {
  const events = local.events.filter(keep);
  for (let i = 0; i < events.length; i += 1000) await db.event.createMany({ data: events.slice(i, i + 1000).map(eventData) });
  console.log("✓ events:", events.length);
}

if (local.settings) {
  const value = local.settings as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key: "site" }, create: { key: "site", value }, update: { value } });
  console.log("✓ settings");
}

const maxRef = Math.max(1000, ...leads.map((l) => Number(/^CK-(\d+)$/.exec(l.ref)?.[1] || 0)));
await db.$executeRaw`select setval('lead_ref_seq', greatest(${maxRef}::bigint, (select last_value from lead_ref_seq)))`;
console.log(`✓ next booking ref will be CK-${maxRef + 1} or later`);
await db.$disconnect();
