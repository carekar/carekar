import type { Metadata } from "next";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ADMIN_COOKIE, STAFF_COOKIE, adminLoginReady, adminPassword, adminToken } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

const errors: Record<string, string> = {
  "1": "Incorrect password",
  "2": "Admin login isn't set up yet. Add ADMIN_PASSWORD and ADMIN_TOKEN to the website and API settings.",
};

function samePassword(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function login(formData: FormData) {
  "use server";
  if (!adminLoginReady()) redirect("/admin/login?error=2");
  if (!samePassword(String(formData.get("password") || ""), adminPassword())) {
    await new Promise((r) => setTimeout(r, 800)); // slows down password guessing
    redirect("/admin/login?error=1");
  }
  const jar = await cookies();
  const maxAge = 60 * 60 * 24 * 30;
  jar.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
  jar.set(STAFF_COOKIE, "1", { sameSite: "lax", path: "/", maxAge });
  redirect("/admin");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const ready = adminLoginReady();
  return (
    <div className="grid min-h-dvh place-items-center bg-forest-900 px-4">
      <form action={login} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-extrabold text-forest-900">Team login</h1>
        <p className="mt-1 text-sm text-ink-600">Leads, payments and funnel analytics.</p>
        <label className="field-label mt-6" htmlFor="password">Team password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
        {(error || !ready) && <p className="mt-2 text-sm font-medium text-danger">{errors[ready ? error ?? "1" : "2"] ?? errors["1"]}</p>}
        <button className="btn-primary mt-5 w-full">Log in</button>
        {process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD && (
          <p className="mt-4 text-center text-xs text-ink-400">Local preview password: carekar-admin</p>
        )}
      </form>
    </div>
  );
}
