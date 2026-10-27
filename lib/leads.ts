import type { Lead } from "./types";

export type LeadFilters = { q?: string; status?: string; vehicle?: string; source?: string; callback?: string };

export function filterLeads(leads: Lead[], sp: LeadFilters) {
  const q = sp.q?.trim().toLowerCase();
  return leads
    .filter((l) => !sp.status || l.status === sp.status)
    .filter((l) => !sp.vehicle || l.vehicle === sp.vehicle)
    .filter((l) => !sp.source || l.firstTouch?.channel === sp.source)
    .filter((l) => !sp.callback || l.callbackRequested)
    .filter((l) => !q || [l.name, l.mobile, l.society, l.ref, l.vehicleModel].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
