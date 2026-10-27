import { fileRepo } from "./db/file";
import { postgresRepo } from "./db/postgres";
import type { DB, Lead, LeadFields, LeadMeta, LeadStatus, Payment, Session, Settings, TeamMember, TrackEvent } from "../../lib/types";

/** Storage backend. db/postgres.ts (Prisma) and db/file.ts (local preview) implement it. */
export interface Repo {
  /** Everything the admin dashboard needs (events limited to the last ~6 months). */
  load(): Promise<DB>;
  addEvents(events: TrackEvent[], session?: Session): Promise<void>;
  submitLead(fields: LeadFields, planPrice: number, meta: LeadMeta): Promise<{ id: string; ref: string; duplicate: boolean }>;
  setStatus(id: string, to: LeadStatus, note?: string): Promise<void>;
  addNote(id: string, text: string): Promise<void>;
  clearDemo(): Promise<void>;
  loadDemo(demo: DB): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  /** A logged-in customer's own bookings (matched by Google account), newest first, with their payments. */
  customerBookings(uid: string): Promise<{ lead: Lead; payments: Payment[] }[]>;
  /** Dashboard team (excluding the super admin). Emails are stored lower-case. */
  listTeam(): Promise<TeamMember[]>;
  getTeamMember(email: string): Promise<TeamMember | null>;
  /** Adds the member or changes their role. */
  saveTeamMember(m: Pick<TeamMember, "email" | "role" | "addedBy">): Promise<void>;
  removeTeamMember(email: string): Promise<void>;
  /** Records a successful dashboard login (name from Google). */
  touchTeamMember(email: string, name?: string): Promise<void>;
}

export const hasDatabase = () => !!process.env.DATABASE_URL;

/** Postgres (Prisma) when DATABASE_URL is set, otherwise the local data/db.json file. */
export const repo = (): Repo => (hasDatabase() ? postgresRepo : fileRepo);
