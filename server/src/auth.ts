import type { NextFunction, Request, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "./db/client";
import { hasDatabase } from "./repo";

// Admin auth for /api/admin/*. The website logs the team member in with Supabase Auth and
// sends their access token as "Authorization: Bearer <token>". We check the token with
// Supabase and the role in the admin_users table. Without Supabase keys (laptop preview)
// the bearer must equal ADMIN_TOKEN instead.

export type Role = "owner" | "staff";
export type Admin = { id: string; email: string; name?: string; role: Role };

declare module "express-serve-static-core" {
  interface Request {
    admin?: Admin;
  }
}

const supabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = () =>
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const previewToken = () => process.env.ADMIN_TOKEN || "dev-preview-token";

export const hasSupabaseAuth = () => hasDatabase() && !!supabaseUrl() && !!supabaseAnonKey();

let sb: SupabaseClient | undefined;
const supabase = () => (sb ??= createClient(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false, autoRefreshToken: false } }));

async function adminFromToken(token: string): Promise<Admin | null> {
  if (!hasSupabaseAuth()) return token === previewToken() ? { id: "preview", email: "preview", name: "Preview", role: "owner" } : null;
  const { data } = await supabase().auth.getUser(token);
  if (!data.user) return null;
  const row = await prisma().adminUser.findUnique({ where: { userId: data.user.id } });
  return row ? { id: row.userId, email: row.email, name: row.name ?? undefined, role: row.role } : null;
}

/** Rejects the request unless it comes from a logged-in team member. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const admin = token ? await adminFromToken(token) : null;
  if (!admin) return void res.status(401).json({ error: "Not logged in" });
  req.admin = admin;
  next();
}

/** Use after requireAdmin: payments, settings and demo data are for the owner only. */
export function ownerOnly(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.role !== "owner") return void res.status(403).json({ error: "Owner only" });
  next();
}
