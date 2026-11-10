import { knownSocieties, oneTime as defaultOneTime, plans as defaultPlans, site, type Plan, type Service } from "./site";
import type { Settings } from "./types";

// Live site configuration: defaults from lib/site.ts overridden by admin settings.
// Safe to import from client components (no server code here).

/** One vehicle type's one-time cleaning: its price and what's included. */
export type OneTimeOption = Pick<Plan, "vehicle" | "label" | "image" | "price" | "inclusions">;

export type SiteConfig = {
  contact: { phone: string; whatsapp: string; email: string };
  /** Plans shown on the site (hidden plans removed), with current prices. */
  plans: Plan[];
  /** Every plan including hidden ones (admin use). */
  allPlans: Plan[];
  /** One-time cleaning (single visit), priced per vehicle type. */
  oneTime: {
    label: string;
    image: string;
    /** car inclusions, for the home page card */
    inclusions: string[];
    /** the whole service is hidden (by the admin, or every vehicle is hidden) */
    hidden: boolean;
    /** vehicle types offered on the site, with their one-time price */
    options: OneTimeOption[];
    /** every vehicle type including hidden ones (admin use) */
    allOptions: OneTimeOption[];
    /** lowest price on offer, for "from ₹X" */
    price: number;
  };
  societies: string[];
};

export function buildConfig(s: Settings = {}): SiteConfig {
  const allPlans = defaultPlans.map((p) => ({ ...p, price: s.prices?.[p.vehicle] ?? p.price }));
  const hidden = new Set(s.hiddenPlans || []);
  const allOptions: OneTimeOption[] = defaultPlans.map((p) => ({
    vehicle: p.vehicle,
    label: p.label,
    image: p.image,
    price: s.oneTime?.prices?.[p.vehicle] ?? s.oneTime?.price ?? defaultOneTime.price,
    inclusions: p.vehicle === "bike" ? defaultOneTime.bikeInclusions : defaultOneTime.inclusions,
  }));
  const hiddenOneTime = new Set(s.oneTime?.hiddenVehicles || []);
  const options = allOptions.filter((o) => !hiddenOneTime.has(o.vehicle));
  return {
    contact: {
      phone: s.contact?.phone || site.contact.phone,
      whatsapp: s.contact?.whatsapp || site.contact.whatsapp,
      email: s.contact?.email ?? site.contact.email,
    },
    plans: allPlans.filter((p) => !hidden.has(p.vehicle)),
    allPlans,
    oneTime: {
      label: defaultOneTime.label,
      image: defaultOneTime.image,
      inclusions: defaultOneTime.inclusions,
      hidden: !!s.oneTime?.hidden || !options.length,
      options,
      allOptions,
      price: options.length ? Math.min(...options.map((o) => o.price)) : defaultOneTime.price,
    },
    societies: s.societies?.length ? s.societies : knownSocieties,
  };
}

export const defaultConfig = buildConfig();

export const findPlan = (cfg: SiteConfig, v: string | null | undefined) => cfg.allPlans.find((p) => p.vehicle === v);

export const oneTimeOption = (cfg: SiteConfig, v: string | null | undefined) => cfg.oneTime.allOptions.find((o) => o.vehicle === v);

/** What the customer pays per vehicle: the one-time price, or the monthly plan price. */
export function priceFor(cfg: SiteConfig, service: Service | undefined, vehicle: string | null | undefined) {
  if (service === "one_time") return oneTimeOption(cfg, vehicle)?.price;
  return findPlan(cfg, vehicle)?.price;
}

/** Why a one-time booking can't be made for this vehicle right now, if it can't. */
export function oneTimeVehicleError(cfg: SiteConfig, d: { service?: string; vehicle?: string }) {
  if (d.service !== "one_time") return undefined;
  if (cfg.oneTime.hidden) return "One-time cleaning isn't available right now";
  if (d.vehicle && !cfg.oneTime.options.some((o) => o.vehicle === d.vehicle)) return "One-time cleaning isn't available for this vehicle";
  return undefined;
}

/** "SUV / MUV plan" or "One-time cleaning (SUV / MUV)". */
export function serviceLabel(cfg: SiteConfig, service: Service | undefined, vehicle: string | null | undefined) {
  const plan = findPlan(cfg, vehicle);
  if (service === "one_time") return `${cfg.oneTime.label}${plan ? ` (${plan.label})` : ""}`;
  return plan ? `${plan.label} plan` : "Plan";
}

export const waHref = (number: string, text?: string) => `https://wa.me/91${number}` + (text ? `?text=${encodeURIComponent(text)}` : "");
export const telHref = (number: string) => `tel:+91${number}`;
