import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { AdminGoogleLogin } from "@/components/admin/AdminGoogleLogin";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function Login() {
  return (
    <div className="grid min-h-dvh place-items-center bg-forest-900 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-extrabold text-forest-900">Team login</h1>
        <p className="mt-1 text-sm text-ink-600">Leads, payments and funnel analytics. Log in with the Google account the admin gave access to.</p>
        <div className="mt-6">
          <AdminGoogleLogin />
        </div>
      </div>
    </div>
  );
}
