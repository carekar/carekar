import type { LeadInput } from "./validation";
import type { VehicleType } from "./site";

// Shared data shapes, used by the website and by the API in server/ (which stores them in
// Supabase Postgres through Prisma, or in server/data/db.json without DATABASE_URL).

export const leadStatuses = [
  "new",
  "contacted",
  "availability_confirmed",
  "payment_link_sent",
  "active",
  "not_serviceable",
  "paused",
  "cancelled",
  "lost",
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const statusLabel: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  availability_confirmed: "Availability confirmed",
  payment_link_sent: "Payment link sent",
  active: "Active",
  not_serviceable: "Not serviceable",
  paused: "Paused",
  cancelled: "Cancelled",
  lost: "Lost",
};

export type Touch = { channel: string; source?: string; medium?: string; campaign?: string; content?: string; landing?: string; referrer?: string; at: string };

export type Lead = Omit<LeadInput, "consent"> & {
  id: string;
  ref: string;
  createdAt: string;
  planPrice: number;
  status: LeadStatus;
  lostReason?: string;
  history: { at: string; from?: LeadStatus; to: LeadStatus; note?: string }[];
  teamNotes: { at: string; text: string }[];
  visitorId?: string;
  firstTouch?: Touch;
  lastTouch?: Touch;
  device?: string;
  inApp?: string;
  /** Google account (Firebase Auth) that confirmed the booking */
  customerUid?: string;
  customerEmail?: string;
  customerName?: string;
  demo?: boolean;
};

export type TrackEvent = {
  at: string;
  visitorId: string;
  sessionId: string;
  name: string;
  props?: Record<string, string | number | boolean | null>;
  path?: string;
  leadId?: string;
  demo?: boolean;
};

export type Session = {
  id: string;
  visitorId: string;
  startedAt: string;
  channel: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  landing?: string;
  referrer?: string;
  device: string;
  os?: string;
  browser?: string;
  inApp?: string;
  returning?: boolean;
  demo?: boolean;
};

export type Payment = {
  id: string;
  leadId: string;
  amount: number;
  method: "upi" | "card" | "netbanking" | "upi_autopay";
  status: "captured" | "failed";
  at: string;
  demo?: boolean;
};

/** Admin-editable settings. Anything missing falls back to the defaults in lib/site.ts. */
export type Settings = {
  contact?: { phone?: string; whatsapp?: string; email?: string };
  prices?: Partial<Record<VehicleType, number>>;
  hiddenPlans?: VehicleType[];
  societies?: string[];
};

export type DB = { leads: Lead[]; events: TrackEvent[]; sessions: Session[]; payments: Payment[]; seq: number; settings?: Settings };

export type LeadMeta = {
  visitorId?: string;
  sessionId?: string;
  first?: Touch;
  last?: Touch;
  device?: string;
  inApp?: string;
  customer?: { uid: string; email?: string; name?: string };
};
export type LeadFields = Omit<LeadInput, "consent">;
