import { knownSocieties, oneTime as defaultOneTime, plans as defaultPlans, site, type Plan, type Service } from "./site";
import type { Settings } from "./types";

// Live site configuration: defaults from lib/site.ts overridden by admin settings.
// Safe to import from client components (no server code here).

export type SiteConfig = {
  contact: { phone: string; whatsapp: string; email: string };
  /** Plans shown on the site (hidden plans removed), with current prices. */
  plans: Plan[];
  /** Every plan including hidden ones (admin use). */
  allPlans: Plan[];
  /** One-time car cleaning (interior + exterior), flat price for any car. */
  oneTime: typeof defaultOneTime & { hidden: boolean };
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
    oneTime: { ...defaultOneTime, price: s.oneTime?.price ?? defaultOneTime.price, hidden: !!s.oneTime?.hidden },
    societies: s.societies?.length ? s.societies : knownSocieties,
  };
}

export const defaultConfig = buildConfig();

export const findPlan = (cfg: SiteConfig, v: string | null | undefined) => cfg.allPlans.find((p) => p.vehicle === v);

/** What the customer pays: one-time = flat price per car; subscription = monthly plan price per vehicle. */
export function priceFor(cfg: SiteConfig, service: Service | undefined, vehicle: string | null | undefined) {
  if (service === "one_time") return cfg.oneTime.price;
  return findPlan(cfg, vehicle)?.price;
}

/** "SUV / MUV plan" or "One-time car cleaning (SUV / MUV)". */
export function serviceLabel(cfg: SiteConfig, service: Service | undefined, vehicle: string | null | undefined) {
  const plan = findPlan(cfg, vehicle);
  if (service === "one_time") return `${cfg.oneTime.label}${plan ? ` (${plan.label})` : ""}`;
  return plan ? `${plan.label} plan` : "Plan";
}
export const waHref = (number: string, text?: string) => `https://wa.me/91${number}` + (text ? `?text=${encodeURIComponent(text)}` : "");
export const telHref = (number: string) => `tel:+91${number}`;
