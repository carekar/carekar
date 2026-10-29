import Link from "next/link";
import { readDB } from "@/lib/store";
import {
  breakdown,
  businessFunnel,
  checkoutStats,
  cohorts,
  contactClicks,
  formAnalytics,
  hourOfDay,
  makeRange,
  pct,
  previousRange,
  salesFunnel,
  societyBreakdown,
  stepCount,
  vehicleBreakdown,
  type Filters,
} from "@/lib/analytics";
import { BarList, Card, Columns, FunnelBars, PageHeader, RangeTabs, Table, hours, inr, istDateTime } from "@/components/admin/ui";
import { statusLabel } from "@/lib/store";

export const metadata = { title: "Funnel" };

const tabs = [
  ["funnel", "Funnel"],
  ["sources", "Sources"],
  ["form", "Form"],
  ["sales", "Sales"],
  ["retention", "Retention"],
  ["abandoned", "Abandoned"],
] as const;

type SP = { d?: string; tab?: string; channel?: string; device?: string };

const fieldLabel: Record<string, string> = {
  vehicle: "Vehicle type", mobile: "Mobile number", name: "Name", society: "Society", locality: "Locality", tower_flat: "Tower / flat", towerFlat: "Tower / flat",
  startDate: "Start date", consent: "Consent", notes: "Notes", review: "Review screen", whatsapp: "WhatsApp number", vehicleModel: "Vehicle model",
};
const stepLabel: Record<string, string> = { "1": "Step 1 · Vehicle", "2": "Step 2 · Details", "3": "Step 3 · Location", "4": "Step 4 · Schedule", "5": "Review" };

export default async function Funnel({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const days = Number(sp.d) || 30;
  const tab = sp.tab || "funnel";
  const f: Filters = { channel: sp.channel, device: sp.device };
  const db = await readDB();
  const r = makeRange(days);
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, d: String(days), ...patch }).filter(([, v]) => v) as [string, string][]);
    return "/admin/funnel?" + p;
  };
  const extra = "&" + new URLSearchParams(Object.entries({ tab, channel: sp.channel, device: sp.device }).filter(([, v]) => v) as [string, string][]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Funnel analytics" subtitle="Where visitors come from, and where they drop off">
        <RangeTabs days={days} base="/admin/funnel" extra={extra} />
      </PageHeader>

      <div className="no-scrollbar sticky top-16 z-30 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-cream-200 bg-cream-50/95 px-4 backdrop-blur md:static md:mx-0 md:px-0">
        {tabs.map(([k, l]) => (
          <Link key={k} href={qs({ tab: k })} className={"shrink-0 border-b-[3px] px-3 py-3 text-sm font-semibold " + (tab === k ? "border-forest-700 text-forest-900" : "border-transparent text-ink-400")}>
            {l}
          </Link>
        ))}
      </div>

      {(tab === "funnel" || tab === "form") && <FilterChips db={db} sp={sp} qs={qs} />}

      {tab === "funnel" && <FunnelTab db={db} days={days} f={f} />}
      {tab === "sources" && <SourcesTab db={db} days={days} />}
      {tab === "form" && <FormTab db={db} days={days} f={f} />}
      {tab === "sales" && <SalesTab db={db} days={days} />}
      {tab === "retention" && <RetentionTab db={db} />}
      {tab === "abandoned" && <AbandonedTab db={db} days={days} />}
      <p className="mt-6 text-center text-xs text-ink-400">Range: {istDateTime(new Date(r.from).toISOString())} – now (IST)</p>
    </div>
  );
}

type DB = Awaited<ReturnType<typeof readDB>>;

function FilterChips({ db, sp, qs }: { db: DB; sp: SP; qs: (p: Partial<SP>) => string }) {
  const channels = [...new Set(db.sessions.map((s) => s.channel))].sort();
  return (
    <div className="mb-4 space-y-2">
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Link href={qs({ channel: undefined })} data-active={!sp.channel} className="chip shrink-0 !min-h-9 !px-3 !text-xs">All sources</Link>
        {channels.map((c) => (
          <Link key={c} href={qs({ channel: sp.channel === c ? undefined : c })} data-active={sp.channel === c} className="chip shrink-0 !min-h-9 !px-3 !text-xs">{c}</Link>
        ))}
      </div>
      <div className="flex gap-1.5">
        {[undefined, "mobile", "desktop", "tablet"].map((d) => (
          <Link key={d ?? "all"} href={qs({ device: d })} data-active={sp.device === d} className="chip !min-h-9 !px-3 !text-xs capitalize">{d ?? "All devices"}</Link>
        ))}
      </div>
    </div>
  );
}

function FunnelTab({ db, days, f }: { db: DB; days: number; f: Filters }) {
  const r = makeRange(days);
  const steps = businessFunnel(db, r, f);
  const prev = businessFunnel(db, previousRange(r), f);
  const n = (key: string, list = steps) => stepCount(list, key);
  // Biggest drop-off between consecutive steps
  let worst = { label: "", rate: 1 };
  for (let i = 1; i < steps.length; i++) {
    const rate = steps[i - 1].count ? steps[i].count / steps[i - 1].count : 1;
    if (rate < worst.rate) worst = { label: `${steps[i - 1].label} → ${steps[i].label}`, rate };
  }
  const contacts = contactClicks(db, r);
  const co = checkoutStats(db, r);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card title="Full journey · visit to paid">
        <FunnelBars steps={steps} />
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-600">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-forest-700" /> Website</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-sun-400" /> Payment (Razorpay)</span>
        </div>
      </Card>
      <div className="min-w-0 space-y-4">
        <Card title="Conversion">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Visit → booking", pct(n("submitted"), n("visited")), pct(n("submitted", prev), n("visited", prev))],
              ["Booking → paid", pct(n("paid"), n("submitted")), pct(n("paid", prev), n("submitted", prev))],
              ["Visit → paid", pct(n("paid"), n("visited")), pct(n("paid", prev), n("visited", prev))],
              ["Plan view → book", pct(n("book"), n("plan")), pct(n("book", prev), n("plan", prev))],
            ].map(([l, v, p]) => (
              <div key={l as string} className="rounded-xl bg-cream-50 p-3">
                <p className="text-xs text-ink-600">{l}</p>
                <p className="font-display tabular text-2xl font-extrabold text-forest-900">{v}%</p>
                <p className="text-[11px] text-ink-400">prev. period {p}%</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Razorpay checkout" action={<Link href="/admin/payments" className="text-sm font-semibold text-forest-700">Payments</Link>}>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Opened", co.started],
              ["Paid", co.paid],
              ["Closed", co.cancelled],
              ["Failed", co.failed],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-cream-50 p-2.5">
                <p className="font-display tabular text-xl font-extrabold text-forest-900">{v}</p>
                <p className="text-[11px] text-ink-600">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-400">
            {pct(co.paid, co.started)}% of opened payments were completed · {co.unpaid.length} booking{co.unpaid.length === 1 ? "" : "s"} still unpaid
          </p>
        </Card>
        {worst.label && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm">
            <p className="font-bold text-danger">Biggest drop-off</p>
            <p className="mt-1 text-ink-900">{worst.label}</p>
            <p className="text-ink-600">Only {Math.round(worst.rate * 100)}% continue to the next step.</p>
          </div>
        )}
        <Card title="Where people tap (CTA location)">
          <Table
            head={["Location", "Book", "WhatsApp", "Call"]}
            rows={contacts.map((c) => [c.location.replace(/_/g, " "), c.book, c.whatsapp, c.call])}
          />
        </Card>
      </div>
    </div>
  );
}

function SourcesTab({ db, days }: { db: DB; days: number }) {
  const r = makeRange(days);
  const fmt = (rows: ReturnType<typeof breakdown>) =>
    rows.map((x) => [x.key, x.visitors, x.leads, `${pct(x.leads, x.visitors)}%`, x.paid, inr(x.revenue)]);
  const head = ["Source", "Visitors", "Bookings", "Booking %", "Paid", "Collected"];
  const hrs = hourOfDay(db, r);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="By channel" className="lg:col-span-2"><Table head={head} rows={fmt(breakdown(db, r, "channel"))} /></Card>
      <Card title="By campaign / poster (UTM)"><Table head={["Campaign", ...head.slice(1)]} rows={fmt(breakdown(db, r, "campaign").filter((x) => x.key !== "(none)"))} /></Card>
      <Card title="By device"><Table head={["Device", ...head.slice(1)]} rows={fmt(breakdown(db, r, "device"))} /></Card>
      <Card title="By browser / in-app"><Table head={["Browser", ...head.slice(1)]} rows={fmt(breakdown(db, r, "browser"))} /></Card>
      <Card title="By vehicle">
        <Table head={["Vehicle", "Viewed", "Bookings", "Paid", "Collected"]} rows={vehicleBreakdown(db, r).map((v) => [v.key, v.viewed, v.leads, v.paid, inr(v.revenue)])} />
      </Card>
      <Card title="By society (demand)">
        <Table head={["Society", "Bookings", "Active", "Not serv."]} rows={societyBreakdown(db, r).slice(0, 15).map((s) => [s.key, s.leads, s.active, s.notServiceable])} />
      </Card>
      <Card title="Time of day (IST)">
        <Columns
          height={110}
          data={hrs.map((h) => ({ label: `${h.h}:00`, values: [h.visitors, h.leads * 10] }))}
          keys={[{ label: "Visitors", tone: "bg-leaf-200" }, { label: "Leads (×10)", tone: "bg-forest-700" }]}
        />
      </Card>
    </div>
  );
}

function FormTab({ db, days, f }: { db: DB; days: number; f: Filters }) {
  const fa = formAnalytics(db, makeRange(days), f);
  const prefTotal = fa.prefilled.yes + fa.prefilled.no;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Booking form · step by step" className="lg:col-span-2">
        <FunnelBars steps={fa.steps.map((s, i) => ({ key: String(i), label: s.median ? `${s.label} · ~${Math.round(s.median / 1000)}s` : s.label, count: s.count }))} />
      </Card>
      <Card title="Where people leave the form">
        <BarList rows={fa.abandonByStep.map(([k, v]) => [stepLabel[k] ?? k, v])} tone="bg-red-100" />
      </Card>
      <Card title="Last field before leaving">
        <BarList rows={fa.abandonByField.map(([k, v]) => [fieldLabel[k] ?? k, v])} tone="bg-red-100" />
      </Card>
      <Card title="Validation errors by field">
        <BarList rows={fa.fieldErrors.map(([k, v]) => [fieldLabel[k] ?? k, v])} tone="bg-sun-400/40" />
      </Card>
      <Card title="Insights">
        <ul className="space-y-3 text-sm">
          <li className="rounded-xl bg-cream-50 p-3">
            <span className="font-bold text-forest-900">{pct(fa.prefilled.yes, prefTotal)}%</span> of form opens came from a plan card (vehicle pre-selected).
          </li>
          <li className="rounded-xl bg-cream-50 p-3">
            <span className="font-bold text-forest-900">{fa.notListed}</span> bookings typed a society that is not in the suggestion list — review in Sources → By society.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function SalesTab({ db, days }: { db: DB; days: number }) {
  const s = salesFunnel(db, makeRange(days));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Speed (median)">
        <div className="grid grid-cols-2 gap-2 text-center">
          {[
            ["Booking → paid", s.times.bookingToPaid],
            ["Payment link → paid", s.times.payment],
            ["Callback · first response", s.times.firstResponse],
            ["Confirm availability", s.times.confirmation],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-cream-50 p-3">
              <p className="font-display tabular text-xl font-extrabold text-forest-900">{v ? hours(v as number) : "—"}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-ink-600">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">{Math.round(s.callbackRate * 100)}% of bookings asked for a callback instead of paying.</p>
      </Card>
      <Card title={`Lead status · ${s.total} leads`}>
        <BarList rows={[...s.statusCounts.entries()].map(([k, v]) => [statusLabel[k], v])} />
      </Card>
      <Card title="Why leads are lost">
        <BarList rows={s.lostReasons} tone="bg-red-100" />
      </Card>
      <Card title="Payment methods">
        {(() => {
          const m = new Map<string, number>();
          for (const p of db.payments) if (p.status === "captured") m.set(p.method, (m.get(p.method) || 0) + 1);
          return <BarList rows={[...m.entries()].map(([k, v]) => [k.replace("_", " ").toUpperCase(), v])} />;
        })()}
      </Card>
    </div>
  );
}

function RetentionTab({ db }: { db: DB }) {
  const rows = cohorts(db);
  const cancelled = db.leads.filter((l) => l.status === "cancelled");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Monthly cohorts · % still paying" className="lg:col-span-2">
        <Table
          head={["First paid", "Customers", "Month 2", "Month 3", "Month 4"]}
          rows={rows.map((c) => [c.month, c.size, ...c.retained.map((x) => (x === null ? "—" : Math.round(x * 100) + "%"))])}
        />
      </Card>
      <Card title="Cancellations">
        <p className="font-display tabular text-3xl font-extrabold text-forest-900">{cancelled.length}</p>
        <BarList rows={(() => {
          const m = new Map<string, number>();
          for (const l of cancelled) m.set(l.lostReason || "Not specified", (m.get(l.lostReason || "Not specified") || 0) + 1);
          return [...m.entries()];
        })()} tone="bg-red-100" />
      </Card>
    </div>
  );
}

function AbandonedTab({ db, days }: { db: DB; days: number }) {
  const fa = formAnalytics(db, makeRange(days));
  const sessions = new Map(db.sessions.map((s) => [s.id, s]));
  return (
    <Card title="Recently abandoned bookings">
      <p className="mb-3 text-sm text-ink-600">
        Anonymous — personal details are only stored after a customer submits the form (Privacy Policy). Use this to spot form problems by step, source and device.
      </p>
      <Table
        head={["When", "Left at", "Field", "Source", "Device"]}
        rows={fa.abandoned.map((e) => {
          const s = sessions.get(e.sessionId);
          return [istDateTime(e.at), stepLabel[String(e.props?.last_step)] ?? "—", fieldLabel[String(e.props?.last_field)] ?? String(e.props?.last_field ?? "—"), s?.channel ?? "—", s ? `${s.device}${s.inApp ? " · " + s.inApp : ""}` : "—"];
        })}
      />
    </Card>
  );
}
