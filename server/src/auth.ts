import type { NextFunction, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { roleRank, type AdminRole } from "../../lib/types";
import { googleUserFromToken } from "./customer";
import { repo } from "./repo";

// Dashboard (/admin) auth. The team logs in with Google on the website; the website sends the
// Firebase ID token to POST /api/admin/session, and gets back a 30-day session token signed
// with ADMIN_SESSION_SECRET. Every admin request carries that token as a bearer, and the role
// is looked up again each time, so removing someone or changing their role applies at once.
//
//   super_admin: SUPER_ADMIN_EMAILS (default carekarservice@gmail.com). Everything + Team page.
//   editor:      view everything, change lead status/notes, settings, demo data, CSV export.
//   viewer:      view only.

export type Admin = { email: string; name?: string; role: AdminRole };

declare module "express-serve-static-core" {
  interface Request {
    admin?: Admin;
  }
}

const SESSION_DAYS = 30;
const MIN_SECRET = 32;

export const superAdmins = () =>
  (process.env.SUPER_ADMIN_EMAILS || "carekarservice@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/** In production there is no default: a missing or short secret closes the dashboard. */
function sessionSecret() {
  const s = process.env.ADMIN_SESSION_SECRET || "";
  if (process.env.NODE_ENV === "production") return s.length >= MIN_SECRET ? s : "";
  return s || "dev-only-admin-session-secret-change-me";
}

export const adminConfigured = () => !!sessionSecret();

/** Current role for an email, or null if it has no dashboard access. */
export async function roleFor(email: string): Promise<AdminRole | null> {
  if (superAdmins().includes(email)) return "super_admin";
  return (await repo().getTeamMember(email))?.role ?? null;
}

/** Exchanges a Firebase ID token for a dashboard session. */
export async function startSession(idToken: string | undefined) {
  const secret = sessionSecret();
  if (!secret) return { error: "Dashboard login isn't set up (ADMIN_SESSION_SECRET missing)", status: 503 } as const;
  const user = await googleUserFromToken(idToken);
  if (!user?.email || !user.emailVerified) return { error: "Couldn't verify your Google account. Please try again.", status: 401 } as const;
  const role = await roleFor(user.email);
  if (!role) return { error: `${user.email} doesn't have dashboard access. Ask the admin to add you.`, status: 403 } as const;

  if (role !== "super_admin") await repo().touchTeamMember(user.email, user.name);
  const token = await new SignJWT({ name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(new TextEncoder().encode(secret));
  return { token, admin: { email: user.email, name: user.name, role } satisfies Admin, maxAgeDays: SESSION_DAYS } as const;
}

async function adminFromSession(token: string): Promise<Admin | null> {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    const email = payload.sub;
    if (!email) return null;
    const role = await roleFor(email);
    return role ? { email, name: typeof payload.name === "string" ? payload.name : undefined, role } : null;
  } catch {
    return null;
  }
}

/** Rejects the request unless it carries a valid dashboard session for someone who still has access. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = await adminFromSession(req.get("authorization")?.replace(/^Bearer\s+/i, "") || "");
  if (!admin) return void res.status(401).json({ error: "Not logged in" });
  req.admin = admin;
  next();
}

/** Use after requireAdmin: needs at least this role. */
export const requireRole = (min: AdminRole) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.admin || roleRank[req.admin.role] < roleRank[min]) {
    return void res.status(403).json({ error: min === "super_admin" ? "Only the super admin can do this" : "View-only access: ask the admin for editor access" });
  }
  next();
};
