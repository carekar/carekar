import type { Lead } from "./types";
import { formatINR, planByVehicle } from "./site";

export const isOneTime = (l: Pick<Lead, "service">) => l.service === "one_time";

/** "SUV / MUV" or "One-time · SUV / MUV" */
export const leadPlanLabel = (l: Pick<Lead, "service" | "vehicle">) =>
  (isOneTime(l) ? "One-time · " : "") + (planByVehicle(l.vehicle)?.label ?? l.vehicle);

/** "₹799/mo" or "₹249 one-time" */
export const leadPriceLabel = (l: Pick<Lead, "service" | "planPrice">) =>
  formatINR(l.planPrice) + (isOneTime(l) ? " one-time" : "/mo");

export type LeadFilters = { q?: string; status?: string; vehicle?: string; service?: string; source?: string; callback?: string };

export function filterLeads(leads: Lead[], sp: LeadFilters) {
  const q = sp.q?.trim().toLowerCase();
  return leads
    .filter((l) => !sp.status || l.status === sp.status)
    .filter((l) => !sp.vehicle || l.vehicle === sp.vehicle)
    .filter((l) => !sp.service || (l.service ?? "subscription") === sp.service)
    .filter((l) => !sp.source || l.firstTouch?.channel === sp.source)
    .filter((l) => !sp.callback || l.callbackRequested)
    .filter((l) => !q || [l.name, l.mobile, l.society, l.ref, l.vehicleModel].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
