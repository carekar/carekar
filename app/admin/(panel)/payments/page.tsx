import Link from "next/link";
import { readDB } from "@/lib/store";
import { requireAdmin } from "@/lib/admin";
import { makeRange, paymentStats, subscriptionStats } from "@/lib/analytics";
import { Card, Kpi, PageHeader, RangeTabs, Table, inr, istDateTime } from "@/components/admin/ui";
import { planByVehicle } from "@/lib/site";

export const metadata = { title: "Payments" };

export default async function Payments({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const days = Number((await searchParams).d) || 30;
  await requireAdmin();
  const db = await readDB();
  const s = paymentStats(db, makeRange(days));
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
      <PageHeader title="Payments" subtitle="Razorpay transactions & subscriptions">
        <RangeTabs days={days} base="/admin/payments" />
      </PageHeader>

      {db.payments.some((p) => p.demo) && (
        <p className="mb-4 rounded-xl bg-sun-400/20 p-3 text-sm text-forest-900">
          Includes demo payments. Clear demo data in Settings once real payments start.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Collected" value={inr(s.collected)} sub={`${s.count} payments`} icon="wallet" />
        <Kpi label="Failed" value={String(s.failed)} sub="needs follow-up" icon="alert" />
        <Kpi label="Active subscriptions" value={String(subs.active)} icon="repeat" />
        <Kpi label="MRR" value={inr(subs.mrr)} icon="rupee" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
            head={["Date", "Customer", "Method", "Amount"]}
            rows={[...s.pays].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50).map((p) => [
              istDateTime(p.at),
              <Link key={p.id} href={`/admin/leads/${p.leadId}`} className="text-forest-700 underline">{leads.get(p.leadId)?.name ?? "—"}</Link>,
              p.method.replace("_", " "),
              p.status === "captured" ? inr(p.amount) : <span key="f" className="text-danger">Failed</span>,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}
