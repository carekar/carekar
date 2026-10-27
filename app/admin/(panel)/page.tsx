import Link from "next/link";
import { readDB } from "@/lib/store";
import { getAdmin } from "@/lib/admin";
import { businessFunnel, dailySeries, makeRange, needsAction, overviewKpis, pct, previousRange, subscriptionStats } from "@/lib/analytics";
import { Card, Columns, FunnelBars, Kpi, PageHeader, RangeTabs, StatusPill, inr, timeAgo } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { leadPlanLabel } from "@/lib/leads";

export const metadata = { title: "Overview" };

const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

export default async function Overview({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const days = Number((await searchParams).d) || 30;
  const db = await readDB();
  const owner = (await getAdmin())?.role === "owner";
  const r = makeRange(days);
  const k = overviewKpis(db, r);
  const kp = overviewKpis(db, previousRange(r));
  const subs = subscriptionStats(db);
  const todo = needsAction(db);
  const series = dailySeries(db, makeRange(Math.max(days, 14)));
  const funnel = businessFunnel(db, r);
  const visitors = funnel[0].count;

  const actionItems = [
    { n: todo.fresh.length + todo.stale.length, label: "New leads to contact", sub: todo.stale.length ? `${todo.stale.length} waiting over 2 hours` : "All within 2 hours", href: "/admin/leads?status=new", urgent: todo.stale.length > 0 },
    { n: todo.awaitingCheck.length, label: "Availability to confirm", sub: "Contacted, not yet confirmed", href: "/admin/leads?status=contacted" },
    { n: todo.awaitingPayment.length, label: "Awaiting payment", sub: "Payment link sent", href: "/admin/leads?status=payment_link_sent" },
    { n: todo.failed.length, label: "Failed payments (7 days)", sub: "Follow up on WhatsApp", href: owner ? "/admin/payments" : "/admin/leads?status=payment_link_sent", urgent: todo.failed.length > 0 },
  ];

  const recent = [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Overview" subtitle="How Carekar is doing">
        <RangeTabs days={days} base="/admin" />
      </PageHeader>

      {todo.noLeads24h && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-danger">
          <Icon name="alert" className="size-5" /> No new leads in the last 24 hours
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Visitors" value={k.visitors.toLocaleString("en-IN")} delta={delta(k.visitors, kp.visitors)} sub="vs prev." icon="users" />
        <Kpi label="Leads" value={String(k.leads)} delta={delta(k.leads, kp.leads)} sub={`${pct(k.leads, k.visitors)}% of visitors`} icon="list" />
        <Kpi label="Paid customers" value={String(k.paid)} delta={delta(k.paid, kp.paid)} sub={`${pct(k.paid, k.leads)}% of leads`} icon="checkCircle" />
        {owner && <Kpi label="Collected" value={inr(k.revenue)} delta={delta(k.revenue, kp.revenue)} sub="vs prev." icon="wallet" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-forest-900 p-4 text-white">
          <p className="text-xs font-semibold text-white/70">Active subscriptions</p>
          <p className="font-display tabular mt-1.5 text-[26px] font-extrabold leading-none">{subs.active}</p>
        </div>
        {owner && (
          <div className="rounded-2xl bg-forest-900 p-4 text-white">
            <p className="text-xs font-semibold text-white/70">Monthly recurring revenue</p>
            <p className="font-display tabular mt-1.5 text-[26px] font-extrabold leading-none text-sun-400">{inr(subs.mrr)}</p>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card title="Needs action">
          <ul className="divide-y divide-cream-100">
            {actionItems.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="flex min-h-14 items-center gap-3 py-2">
                  <span className={"font-display tabular grid size-11 shrink-0 place-items-center rounded-xl text-lg font-extrabold " + (a.urgent ? "bg-red-50 text-danger" : a.n ? "bg-sun-400/25 text-forest-900" : "bg-cream-100 text-ink-400")}>
                    {a.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">{a.label}</span>
                    <span className="block text-xs text-ink-400">{a.sub}</span>
                  </span>
                  <Icon name="chevronRight" className="size-5 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Latest leads" action={<Link href="/admin/leads" className="text-sm font-semibold text-forest-700">All leads</Link>}>
          <ul className="divide-y divide-cream-100">
            {recent.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/leads/${l.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">{l.name}</span>
                    <span className="block truncate text-xs text-ink-400">
                      {leadPlanLabel(l)} · {l.society} · {timeAgo(l.createdAt)}
                    </span>
                  </span>
                  <StatusPill status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Daily trend">
          <Columns
            data={series.map((d) => ({ label: d.day.slice(5), values: [d.visitors, d.leads * 10] }))}
            keys={[
              { label: "Visitors", tone: "bg-leaf-200" },
              { label: "Leads (×10)", tone: "bg-forest-700" },
            ]}
          />
        </Card>
        <Card title={`Funnel · last ${days === 1 ? "24 hours" : days + " days"}`} action={<Link href={`/admin/funnel?d=${days}`} className="text-sm font-semibold text-forest-700">Details</Link>}>
          <FunnelBars steps={[funnel[0], funnel[3], funnel[6], funnel[10]]} />
          <p className="mt-3 text-xs text-ink-400">
            {pct(funnel[10].count, visitors)}% of visitors became paying customers
          </p>
        </Card>
      </div>
    </div>
  );
}
