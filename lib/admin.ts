import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "./auth";
import { api, ApiError } from "./api";
import { roleRank, type AdminRole } from "./types";

export type Admin = { email: string; name?: string; role: AdminRole };

/** The dashboard session token sent to the API as "Authorization: Bearer …". */
export async function adminBearer(): Promise<string | undefined> {
  return (await cookies()).get(ADMIN_COOKIE)?.value;
}

/** Asks the API who this session belongs to and their current role. null = not logged in / no access. */
export async function adminForToken(token: string | undefined) {
  if (!token) return null;
  try {
    return await api<Admin>("/api/admin/me", { token });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

/** The logged-in team member, or null. */
export const getAdmin = cache(async () => adminForToken(await adminBearer()));

export const can = (admin: Admin | null | undefined, min: AdminRole) => !!admin && roleRank[admin.role] >= roleRank[min];

/** Logged-in team member with at least `min` access (default: viewer), otherwise redirect. */
export async function requireAdmin(min: AdminRole = "viewer") {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (!can(admin, min)) redirect("/admin");
  return admin;
}
