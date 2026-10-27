"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_COOKIE, STAFF_COOKIE } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { api } from "@/lib/api";
import { CONFIG_TAG } from "@/lib/settings";
import { plans } from "@/lib/site";

// Admin form actions. The API re-checks the login and role on every call.

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(STAFF_COOKIE);
  redirect("/admin/login");
}

export async function updateStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await api(`/api/admin/leads/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: { status: formData.get("status"), note: formData.get("lostReason") || undefined },
  });
  revalidatePath("/admin", "layout");
}

export async function addNote(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await api(`/api/admin/leads/${encodeURIComponent(id)}/notes`, { method: "POST", body: { text } });
  revalidatePath(`/admin/leads/${id}`);
}

export async function clearDemo() {
  await requireAdmin("owner");
  await api("/api/admin/demo/clear", { method: "POST" });
  revalidatePath("/admin", "layout");
}

export async function restoreDemo() {
  await requireAdmin("owner");
  await api("/api/admin/demo/restore", { method: "POST" });
  revalidatePath("/admin", "layout");
}

export async function saveSettings(formData: FormData) {
  await requireAdmin("owner");
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
