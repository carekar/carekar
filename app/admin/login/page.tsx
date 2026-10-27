import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ADMIN_COOKIE, STAFF_COOKIE, adminPassword, adminToken } from "@/lib/auth";
import { adminForToken, authClient } from "@/lib/admin";
import { hasSupabaseAuth } from "@/lib/env";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

const errors: Record<string, string> = {
  "1": "Incorrect email or password",
  "2": "This account doesn't have admin access. Ask the owner to add you.",
};

async function login(formData: FormData) {
  "use server";
  const jar = await cookies();
  const maxAge = 60 * 60 * 24 * 30;

  if (hasSupabaseAuth()) {
    const sb = await authClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
    });
    if (error || !data.session) redirect("/admin/login?error=1");
    if (!(await adminForToken(data.session.access_token))) {
      await sb.auth.signOut();
      redirect("/admin/login?error=2");
    }
  } else {
    if (formData.get("password") !== adminPassword()) redirect("/admin/login?error=1");
    jar.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: "lax", path: "/", maxAge });
  }
  jar.set(STAFF_COOKIE, "1", { sameSite: "lax", path: "/", maxAge });
  redirect("/admin");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = hasSupabaseAuth();
  return (
    <div className="grid min-h-dvh place-items-center bg-forest-900 px-4">
      <form action={login} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-extrabold text-forest-900">Team login</h1>
        <p className="mt-1 text-sm text-ink-600">Leads, payments and funnel analytics.</p>
        {supabase && (
          <>
            <label className="field-label mt-6" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username" inputMode="email" className="field" />
          </>
        )}
        <label className={"field-label " + (supabase ? "mt-4" : "mt-6")} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
        {error && <p className="mt-2 text-sm font-medium text-danger">{errors[error] ?? errors["1"]}</p>}
        <button className="btn-primary mt-5 w-full">Log in</button>
        {!supabase && <p className="mt-4 text-center text-xs text-ink-400">Preview password: carekar-admin</p>}
      </form>
    </div>
  );
}
