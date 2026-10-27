"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_COOKIE, STAFF_COOKIE } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { api, ApiError } from "@/lib/api";
import { CONFIG_TAG } from "@/lib/settings";
import { plans } from "@/lib/site";

// Admin form actions. Changes need editor access, team changes need the super admin.
// The API re-checks the session and role on every call.

/** Google login: swaps the Firebase ID token for a dashboard session cookie. */
export async function adminLogin(idToken: string): Promise<{ error?: string }> {
  let session: { token: string; maxAgeDays: number };
  try {
    session = await api("/api/admin/session", { method: "POST", body: { idToken }, token: null });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Couldn't reach the server. Please try again." };
  }
  const jar = await cookies();
  const maxAge = session.maxAgeDays * 86400;
  jar.set(ADMIN_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
  jar.set(STAFF_COOKIE, "1", { sameSite: "lax", path: "/", maxAge });
  return {};
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(STAFF_COOKIE);
  redirect("/admin/login");
}

export async function updateStatus(formData: FormData) {
  await requireAdmin("editor");
  const id = String(formData.get("id"));
  await api(`/api/admin/leads/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: { status: formData.get("status"), note: formData.get("lostReason") || undefined },
  });
  revalidatePath("/admin", "layout");
}

export async function addNote(formData: FormData) {
  await requireAdmin("editor");
  const id = String(formData.get("id"));
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await api(`/api/admin/leads/${encodeURIComponent(id)}/notes`, { method: "POST", body: { text } });
  revalidatePath(`/admin/leads/${id}`);
}

export async function clearDemo() {
  await requireAdmin("editor");
  await api("/api/admin/demo/clear", { method: "POST" });
  revalidatePath("/admin", "layout");
}

export async function restoreDemo() {
  await requireAdmin("editor");
  await api("/api/admin/demo/restore", { method: "POST" });
  revalidatePath("/admin", "layout");
}

export async function saveSettings(formData: FormData) {
  await requireAdmin("editor");
  await api("/api/admin/settings", {
    method: "PUT",
    body: {
      phone: formData.get("phone"),
      whatsapp: formData.get("whatsapp"),
      email: formData.get("email"),
      prices: Object.fromEntries(plans.map((p) => [p.vehicle, formData.get("price_" + p.vehicle)])),
      hiddenPlans: plans.filter((p) => formData.get("hidden_" + p.vehicle)).map((p) => p.vehicle),
      oneTimePrice: formData.get("oneTimePrice"),
      oneTimeHidden: !!formData.get("oneTimeHidden"),
      societies: String(formData.get("societies") || "").split("\n"),
    },
  });
  revalidateTag(CONFIG_TAG);
  revalidatePath("/", "layout"); // public pages pick up new prices / numbers
  redirect("/admin/settings?saved=1");
}

// ── Team (super admin only) ───────────────────────────────────

async function teamCall(path: string, init: { method: string; body?: unknown }) {
  await requireAdmin("super_admin");
  let error = "";
  try {
    await api(path, init);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Something went wrong";
  }
  revalidatePath("/admin/team");
  redirect("/admin/team" + (error ? "?error=" + encodeURIComponent(error) : "?saved=1"));
}

export async function saveTeamMember(formData: FormData) {
  await teamCall("/api/admin/team", {
    method: "PUT",
    body: { email: String(formData.get("email") || ""), role: formData.get("role") },
  });
}

export async function removeTeamMember(formData: FormData) {
  await teamCall(`/api/admin/team/${encodeURIComponent(String(formData.get("email") || ""))}`, { method: "DELETE" });
}
