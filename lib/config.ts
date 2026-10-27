import { knownSocieties, plans as defaultPlans, site, type Plan } from "./site";
import type { Settings } from "./types";

// Live site configuration: defaults from lib/site.ts overridden by admin settings.
// Safe to import from client components (no server code here).

export type SiteConfig = {
  contact: { phone: string; whatsapp: string; email: string };
  /** Plans shown on the site (hidden plans removed), with current prices. */
  plans: Plan[];
  /** Every plan including hidden ones (admin use). */
  allPlans: Plan[];
  societies: string[];
};

export function buildConfig(s: Settings = {}): SiteConfig {
  const allPlans = defaultPlans.map((p) => ({ ...p, price: s.prices?.[p.vehicle] ?? p.price }));
  const hidden = new Set(s.hiddenPlans || []);
  return {
    contact: {
      phone: s.contact?.phone || site.contact.phone,
      whatsapp: s.contact?.whatsapp || site.contact.whatsapp,
      email: s.contact?.email ?? site.contact.email,
    },
    plans: allPlans.filter((p) => !hidden.has(p.vehicle)),
    allPlans,
    societies: s.societies?.length ? s.societies : knownSocieties,
  };
}

export const defaultConfig = buildConfig();

export const findPlan = (cfg: SiteConfig, v: string | null | undefined) => cfg.allPlans.find((p) => p.vehicle === v);
export const waHref = (number: string, text?: string) => `https://wa.me/91${number}` + (text ? `?text=${encodeURIComponent(text)}` : "");
export const telHref = (number: string) => `tel:+91${number}`;
