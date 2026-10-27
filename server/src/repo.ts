import { fileRepo } from "./db/file";
import { postgresRepo } from "./db/postgres";
import type { DB, LeadFields, LeadMeta, LeadStatus, Session, Settings, TrackEvent } from "../../lib/types";

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
}

export const hasDatabase = () => !!process.env.DATABASE_URL;

/** Postgres (Prisma) when DATABASE_URL is set, otherwise the local data/db.json file. */
export const repo = (): Repo => (hasDatabase() ? postgresRepo : fileRepo);
