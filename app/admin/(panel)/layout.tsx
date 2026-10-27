import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { AdminNav } from "@/components/admin/AdminNav";
import { readDB } from "@/lib/store";
import { requireAdmin } from "@/lib/admin";
import { logout } from "../actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Carekar Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const db = await readDB();
  const hasDemo = db.leads.some((l) => l.demo);
  return (
    <div className="min-h-dvh bg-cream-50">
      <header className="sticky top-0 z-40 bg-forest-900 text-white">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo light />
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sun-400">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden max-w-40 truncate px-2 text-sm text-white/70 lg:block">{admin.name || admin.email}</span>
            <Link href="/" target="_blank" className="hidden min-h-11 items-center rounded-full px-3 text-sm text-white/80 hover:text-white sm:flex">View site</Link>
            <form action={logout}>
              <button aria-label="Log out" className="grid size-11 place-items-center rounded-full text-white/80 hover:bg-white/10">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
        {hasDemo && (
          <div className="bg-sun-400 px-4 py-1.5 text-center text-xs font-semibold text-forest-900">
            Showing demo data for preview · real bookings appear alongside ·{" "}
            <Link href="/admin/settings#demo" className="underline">clear demo data</Link>
          </div>
        )}
      </header>
      <div className="md:flex">
        <AdminNav owner={admin.role === "owner"} />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
