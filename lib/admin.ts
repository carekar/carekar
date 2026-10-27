import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "./auth";
import { api, ApiError } from "./api";

export type Role = "owner" | "staff";
export type Admin = { id: string; email: string; name?: string; role: Role };

/** The token sent to the API as "Authorization: Bearer …" (set in the login cookie). */
export async function adminBearer(): Promise<string | undefined> {
  return (await cookies()).get(ADMIN_COOKIE)?.value;
}

/** Asks the API whether this token is valid. null = not logged in. */
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

export async function requireAdmin(role?: Role) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "owner" && admin.role !== "owner") redirect("/admin");
  return admin;
}
