import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Admin auth for /api/admin/*. The team logs in on the website with one shared password; the
// website then sends ADMIN_TOKEN as "Authorization: Bearer <token>". It must match the
// ADMIN_TOKEN set here. In production a missing or short token disables admin access.

export type Role = "owner" | "staff";
export type Admin = { id: string; email: string; name?: string; role: Role };

declare module "express-serve-static-core" {
  interface Request {
    admin?: Admin;
  }
}

const MIN_TOKEN = 24;

function adminToken() {
  const t = process.env.ADMIN_TOKEN || "";
  if (process.env.NODE_ENV === "production") return t.length >= MIN_TOKEN ? t : "";
  return t || "dev-preview-token";
}

/** Whether admin login can work (ADMIN_TOKEN set, or local development). */
export const adminConfigured = () => !!adminToken();

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Rejects the request unless it carries the team's admin token. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = adminToken();
  if (!expected || !sameSecret(token, expected)) return void res.status(401).json({ error: "Not logged in" });
  req.admin = { id: "team", email: "team", name: "Carekar team", role: "owner" };
  next();
}

/** Use after requireAdmin. Everyone with the shared password is an owner today; kept for a future staff login. */
export function ownerOnly(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.role !== "owner") return void res.status(403).json({ error: "Owner only" });
  next();
}
