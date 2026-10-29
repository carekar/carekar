import Link from "next/link";
import { readDB } from "@/lib/store";
import { requireAdmin } from "@/lib/admin";
import { checkoutStats, makeRange, paymentStats, pct, subscriptionStats } from "@/lib/analytics";
import { Card, Kpi, PageHeader, RangeTabs, Table, inr, istDateTime, timeAgo } from "@/components/admin/ui";
import { planByVehicle } from "@/lib/site";
import { leadPlanLabel } from "@/lib/leads";

export const metadata = { title: "Payments" };

const locationLabel: Record<string, string> = { booking: "Booking form", account: "My bookings" };

export default async function Payments({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const days = Number((await searchParams).d) || 30;
  await requireAdmin();
  const db = await readDB();
  const r = makeRange(days);
  const s = paymentStats(db, r);
  const co = checkoutStats(db, r);
  const subs = subscriptionStats(db);
  const leads = new Map(db.leads.map((l) => [l.id, l]));
  const renewals = db.leads
    .filter((l) => l.status === "active" && l.service !== "one_time") // one-time cleanings don't renew
    .map((l) => {
      const last = db.payments.filter((p) => p.leadId === l.id && p.status === "captured").sort((a, b) => b.at.localeCompare(a.at))[0];
      return { l, next: last ? Date.parse(last.at) + 30 * 86400000 : null };
    })
    .filter((x) => x.next && x.next - Date.now() < 7 * 86400000)
    .sort((a, b) => a.next! - b.next!);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Payments" subtitle="Razorpay · paid at booking, payment links and renewals">
        <RangeTabs days={days} base="/admin/payments" />
      </PageHeader>

      {db.payments.some((p) => p.demo) && (
        <p className="mb-4 rounded-xl bg-sun-400/20 p-3 text-sm text-forest-900">
          Includes demo payments. Clear demo data in Settings once real payments start.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Collected" value={inr(s.collected)} sub={`${s.count} payments`} icon="wallet" />
        <Kpi label="Checkout completed" value={`${pct(co.paid, co.started)}%`} sub={`${co.paid} of ${co.started} opened`} icon="checkCircle" />
        <Kpi label="Active subscriptions" value={String(subs.active)} icon="repeat" />
        <Kpi label="MRR" value={inr(subs.mrr)} icon="rupee" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Razorpay checkout">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Opened", co.started],
              ["Paid", co.paid],
              ["Closed", co.cancelled],
              ["Failed", co.failed + s.failed],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-cream-50 p-2.5">
                <p className="font-display tabular text-xl font-extrabold text-forest-900">{v}</p>
                <p className="text-[11px] text-ink-600">{l}</p>
              </div>
            ))}
          </div>
          {co.byLocation.length > 0 && (
            <div className="mt-3">
              <Table
                head={["Where", "Opened", "Paid", "Closed", "Failed"]}
                rows={co.byLocation.map((x) => [locationLabel[x.location] ?? x.location, x.started, x.paid, x.cancelled, x.failed])}
              />
            </div>
          )}
        </Card>

        <div id="unpaid" className="scroll-mt-20">
          <Card title={`Booked but not paid · ${co.unpaid.length}`}>
            {co.unpaid.length ? (
              <Table
                head={["Customer", "Plan", "Booked"]}
                rows={co.unpaid.slice(0, 15).map((l) => [
                  <Link key={l.id} href={`/admin/leads/${l.id}`} className="text-forest-700 underline">{l.name}</Link>,
                  leadPlanLabel(l),
                  timeAgo(l.createdAt),
                ])}
              />
            ) : (
              <p className="text-sm text-ink-400">Everyone who booked in this period has paid.</p>
            )}
            <p className="mt-3 text-xs text-ink-400">Open a booking to send a Razorpay payment link on WhatsApp.</p>
          </Card>
        </div>

        <Card title="Renewals due in 7 days">
          <Table
            head={["Customer", "Plan", "Due"]}
            rows={renewals.slice(0, 15).map(({ l, next }) => [
              <Link key={l.id} href={`/admin/leads/${l.id}`} className="text-forest-700 underline">{l.name}</Link>,
              planByVehicle(l.vehicle)?.label,
              istDateTime(new Date(next!).toISOString()).split(",")[0],
            ])}
          />
        </Card>
        <Card title="By method">
          <Table head={["Method", "Payments", "Amount", "Failed"]} rows={s.byMethod.map((m) => [m.method.replace("_", " ").toUpperCase(), m.count, inr(m.amount), m.failed])} />
        </Card>
        <Card title="Transactions" className="lg:col-span-2">
          <Table
            head={["Date", "Customer", "Ref", "Method", "Razorpay ID", "Amount"]}
            rows={[...s.pays].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50).map((p) => {
              const l = leads.get(p.leadId);
              return [
                istDateTime(p.at),
                <Link key={p.id} href={`/admin/leads/${p.leadId}`} className="text-forest-700 underline">{l?.name ?? "—"}</Link>,
                l?.ref ?? "—",
                p.method.replace("_", " "),
                <span key="id" className="font-mono text-xs">{p.razorpayPaymentId ?? "manual"}</span>,
                p.status === "captured" ? inr(p.amount) : <span key="f" className="text-danger">Failed · {inr(p.amount)}</span>,
              ];
            })}
          />
        </Card>
      </div>
    </div>
  );
}
