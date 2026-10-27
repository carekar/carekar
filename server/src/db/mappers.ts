import type { Prisma } from "../generated/prisma/client";
import type { Lead, LeadMeta, Payment, Session, TrackEvent } from "../../../lib/types";

// Converts between Prisma rows (Date objects, nulls) and the app's shapes (ISO strings,
// missing fields).

type Row = Record<string, unknown>;
const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Dates → ISO strings, nulls dropped. startDate is a calendar date, so it becomes YYYY-MM-DD. */
function fromRow<T>(row: Row): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null) continue;
    if (v instanceof Date) out[k] = k === "startDate" ? v.toISOString().slice(0, 10) : v.toISOString();
    else out[k] = v;
  }
  return out as T;
}

export const leadFromRow = (row: Row) => fromRow<Lead>(row);
export const sessionFromRow = (row: Row) => fromRow<Session>(row);
export const paymentFromRow = (row: Row) => fromRow<Payment>(row);
export const eventFromRow = ({ id: _id, ...row }: Row) => fromRow<TrackEvent>(row); // id is internal

const date = (v?: string) => (v ? new Date(v) : undefined);
const day = (v?: string) => (v ? new Date(v + "T00:00:00Z") : null);

export function leadData(l: Partial<Lead>) {
  return {
    ...l,
    createdAt: date(l.createdAt),
    startDate: l.startDate === undefined ? undefined : day(l.startDate),
    history: l.history && json(l.history),
    teamNotes: l.teamNotes && json(l.teamNotes),
    firstTouch: l.firstTouch && json(l.firstTouch),
    lastTouch: l.lastTouch && json(l.lastTouch),
  };
}

/** The Google account that confirmed the booking, as lead fields (empty for callback requests). */
export const customerFields = ({ customer: c }: LeadMeta): Partial<Lead> =>
  c ? { customerUid: c.uid, customerEmail: c.email, customerName: c.name } : {};

export const sessionData = (s: Session) => ({ ...s, startedAt: date(s.startedAt) });
export const paymentData = (p: Payment) => ({ ...p, at: date(p.at) });
export const eventData = (e: TrackEvent) => ({ ...e, at: date(e.at), props: e.props && json(e.props) });
