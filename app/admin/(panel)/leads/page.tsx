import Link from "next/link";
import { readDB, leadStatuses, statusLabel, type Lead, type LeadStatus } from "@/lib/store";
import { PageHeader, StatusPill, Empty, inr, timeAgo } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { planByVehicle, plans } from "@/lib/site";
import { filterLeads, type LeadFilters } from "@/lib/leads";

export const metadata = { title: "Leads" };

type SP = LeadFilters;

export default async function Leads({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const db = await readDB();
  const leads = filterLeads(db.leads, sp);
  const counts = new Map<string, number>();
  for (const l of db.leads) counts.set(l.status, (counts.get(l.status) || 0) + 1);
  const channels = [...new Set(db.leads.map((l) => l.firstTouch?.channel).filter(Boolean))] as string[];
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return "/admin/leads" + (p.size ? "?" + p : "");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Leads" subtitle={`${leads.length} of ${db.leads.length} leads`}>
        <a href={"/admin/leads/export?" + new URLSearchParams(sp as Record<string, string>)} className="btn-outline !min-h-10 !px-4 text-sm">
          Export CSV
        </a>
      </PageHeader>

      <form className="relative" action="/admin/leads">
        {Object.entries(sp).filter(([k, v]) => k !== "q" && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
        <input name="q" defaultValue={sp.q} placeholder="Search name, mobile, society, ref…" className="field !bg-white !pl-12" type="search" />
      </form>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Link href={qs({ status: undefined })} data-active={!sp.status} className="chip shrink-0 !min-h-10 !px-3.5 !text-[13px]">All · {db.leads.length}</Link>
        {leadStatuses.filter((s) => counts.get(s)).map((s) => (
          <Link key={s} href={qs({ status: s })} data-active={sp.status === s} className="chip shrink-0 !min-h-10 !px-3.5 !text-[13px]">
            {statusLabel[s]} · {counts.get(s)}
          </Link>
        ))}
      </div>

      <details className="mt-2 rounded-xl bg-white p-3 text-sm" open={!!(sp.vehicle || sp.source || sp.callback)}>
        <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-semibold text-forest-700">
          <Icon name="funnel" className="size-4" /> More filters
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {plans.map((p) => (
              <Link key={p.vehicle} href={qs({ vehicle: sp.vehicle === p.vehicle ? undefined : p.vehicle })} data-active={sp.vehicle === p.vehicle} className="chip !min-h-9 !px-3 !text-xs">{p.label}</Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {channels.map((c) => (
              <Link key={c} href={qs({ source: sp.source === c ? undefined : c })} data-active={sp.source === c} className="chip !min-h-9 !px-3 !text-xs">{c}</Link>
            ))}
          </div>
          <Link href={qs({ callback: sp.callback ? undefined : "1" })} data-active={!!sp.callback} className="chip !min-h-9 !px-3 !text-xs">Callback requested</Link>
        </div>
      </details>

      {!leads.length && <div className="mt-4"><Empty text="No leads match these filters." /></div>}

      {/* Phone: cards */}
      <ul className="mt-4 space-y-2.5 md:hidden">
        {leads.slice(0, 40).map((l) => (
          <li key={l.id} className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
            <Link href={`/admin/leads/${l.id}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink-900">{l.name}</p>
                  <p className="truncate text-xs text-ink-400">{l.ref} · {timeAgo(l.createdAt)}{l.callbackRequested ? " · 📞 callback" : ""}</p>
                </div>
                <StatusPill status={l.status} />
              </div>
              <p className="mt-2 text-sm text-ink-600">
                {planByVehicle(l.vehicle)?.label} {l.vehicleModel && `(${l.vehicleModel})`} · <span className="font-semibold text-forest-900">{inr(l.planPrice)}</span>
              </p>
              <p className="truncate text-sm text-ink-600">{l.society}{l.towerFlat && `, ${l.towerFlat}`}</p>
            </Link>
            <QuickActions lead={l} />
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-200 text-left text-xs text-ink-400">
            <tr>
              {["Lead", "Vehicle", "Society", "Source", "Created", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {leads.slice(0, 200).map((l) => (
              <tr key={l.id} className="border-b border-cream-100 last:border-0 hover:bg-cream-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${l.id}`} className="font-semibold text-ink-900 hover:text-forest-700">{l.name}</Link>
                  <p className="text-xs text-ink-400">{l.ref} · +91 {l.mobile}</p>
                </td>
                <td className="px-4 py-3">{planByVehicle(l.vehicle)?.label}<p className="text-xs text-ink-400">{inr(l.planPrice)}/mo</p></td>
                <td className="px-4 py-3">{l.society}</td>
                <td className="px-4 py-3 text-ink-600">{l.firstTouch?.channel ?? "—"}</td>
                <td className="px-4 py-3 text-ink-600">{timeAgo(l.createdAt)}</td>
                <td className="px-4 py-3"><StatusPill status={l.status as LeadStatus} /></td>
                <td className="px-4 py-3"><QuickActions lead={l} compact /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuickActions({ lead, compact }: { lead: Lead; compact?: boolean }) {
  const wa = `https://wa.me/91${lead.whatsapp || lead.mobile}?text=${encodeURIComponent(`Hi ${lead.name.split(" ")[0]}, this is Carekar regarding your booking ${lead.ref}.`)}`;
  return (
    <div className={compact ? "flex justify-end gap-1.5" : "mt-3 grid grid-cols-2 gap-2"}>
      <a href={`tel:+91${lead.mobile}`} className={compact ? "grid size-9 place-items-center rounded-full bg-cream-100 text-forest-700" : "btn-outline !min-h-11 !px-3 text-sm"} aria-label="Call">
        <Icon name="phone" className="size-4" /> {!compact && "Call"}
      </a>
      <a href={wa} target="_blank" rel="noopener" className={compact ? "grid size-9 place-items-center rounded-full bg-[#1faa53] text-white" : "btn-wa !min-h-11 !px-3 text-sm"} aria-label="WhatsApp">
        <Icon name="whatsapp" className="size-4" /> {!compact && "WhatsApp"}
      </a>
    </div>
  );
}
