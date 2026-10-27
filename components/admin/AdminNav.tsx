"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

const allItems: { href: string; label: string; icon: IconName; ownerOnly?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/leads", label: "Leads", icon: "users" },
  { href: "/admin/funnel", label: "Funnel", icon: "funnel" },
  { href: "/admin/payments", label: "Payments", icon: "wallet", ownerOnly: true },
  { href: "/admin/settings", label: "More", icon: "settings", ownerOnly: true },
];

const isActive = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

/** Bottom tab bar on phones, sidebar on desktop. */
export function AdminNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  const items = allItems.filter((i) => owner || !i.ownerOnly);
  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white md:hidden" aria-label="Admin">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((i) => {
            const active = isActive(path, i.href);
            return (
              <li key={i.href}>
                <Link href={i.href} className={"flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold " + (active ? "text-forest-700" : "text-ink-400")}>
                  <span className={"grid h-7 w-12 place-items-center rounded-full " + (active ? "bg-leaf-100" : "")}>
                    <Icon name={i.icon} className="size-5" />
                  </span>
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 border-r border-cream-200 p-4 md:block" aria-label="Admin">
        <ul className="space-y-1">
          {items.map((i) => {
            const active = isActive(path, i.href);
            return (
              <li key={i.href}>
                <Link href={i.href} className={"flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold " + (active ? "bg-leaf-100 text-forest-900" : "text-ink-600 hover:bg-cream-100")}>
                  <Icon name={i.icon} className="size-5" />
                  {i.label === "More" ? "Settings" : i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
