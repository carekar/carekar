import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE } from "./auth";
import { hasSupabaseAuth, supabaseAnonKey, supabaseUrl } from "./env";
import { api, ApiError } from "./api";

export type Role = "owner" | "staff";
export type Admin = { id: string; email: string; name?: string; role: Role };

/** Supabase client bound to the visitor's auth cookies (admin login sessions). */
export async function authClient() {
  const jar = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const c of list) jar.set(c.name, c.value, c.options);
        } catch {
          // called from a server component: middleware refreshes the session instead
        }
      },
    },
  });
}

/** The token sent to the API as "Authorization: Bearer …": the Supabase access token, or the preview cookie. */
export async function adminBearer(): Promise<string | undefined> {
  if (!hasSupabaseAuth()) return (await cookies()).get(ADMIN_COOKIE)?.value;
  const { data } = await (await authClient()).auth.getSession();
  return data.session?.access_token;
}

/** Asks the API who this token belongs to. null = not a team member. */
export async function adminForToken(token: string | undefined) {
  if (!token) return null;
  try {
    return await api<Admin>("/api/admin/me", { token });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

/** The logged-in team member, or null. Owners see revenue, payments and settings; staff don't. */
export const getAdmin = cache(async () => adminForToken(await adminBearer()));

export async function requireAdmin(role?: Role) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "owner" && admin.role !== "owner") redirect("/admin");
  return admin;
}
