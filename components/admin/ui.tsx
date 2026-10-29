import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { statusLabel, type LeadStatus } from "@/lib/store";
import { formatINR } from "@/lib/site";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight text-forest-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function RangeTabs({ days, base, extra = "" }: { days: number; base: string; extra?: string }) {
  const opts = [
    [1, "Today"],
    [7, "7 days"],
    [30, "30 days"],
    [90, "90 days"],
  ] as const;
  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
      {opts.map(([d, l]) => (
        <Link key={d} href={`${base}?d=${d}${extra}`} data-active={days === d} className="chip shrink-0 !min-h-10 !px-3.5 !text-[13px]">
          {l}
        </Link>
      ))}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={"min-w-0 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] md:p-5 " + className}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-sans text-[15px] font-bold tracking-normal text-forest-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, delta, icon }: { label: string; value: string; sub?: string; delta?: number | null; icon?: IconName }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-600">{label}</p>
        {icon && <Icon name={icon} className="size-4 text-ink-400" />}
      </div>
      <p className="font-display tabular mt-1.5 text-[26px] font-extrabold leading-none text-forest-900">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {delta !== undefined && delta !== null && (
          <span className={"rounded-full px-1.5 py-0.5 font-bold " + (delta >= 0 ? "bg-leaf-100 text-forest-700" : "bg-red-50 text-danger")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {sub && <span className="text-ink-400">{sub}</span>}
      </div>
    </div>
  );
}

const statusTone: Record<LeadStatus, string> = {
  new: "bg-sun-400/25 text-forest-900",
  contacted: "bg-sky-100 text-sky-900",
  availability_confirmed: "bg-indigo-100 text-indigo-900",
  payment_link_sent: "bg-violet-100 text-violet-900",
  active: "bg-leaf-100 text-forest-800",
  not_serviceable: "bg-cream-200 text-ink-600",
  paused: "bg-cream-200 text-ink-600",
  cancelled: "bg-red-50 text-danger",
  lost: "bg-red-50 text-danger",
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return <span className={"inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold " + statusTone[status]}>{statusLabel[status]}</span>;
}

/** Funnel bars: count, % of previous step, % of top, and the drop between steps. */
export function FunnelBars({ steps, linkFor }: { steps: { key: string; label: string; count: number; group?: string }[]; linkFor?: (key: string) => string | undefined }) {
  const top = steps[0]?.count || 1;
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].count : s.count;
        const ofPrev = prev ? Math.round((s.count / prev) * 100) : 0;
        const drop = prev - s.count;
        const width = Math.max(2, (s.count / top) * 100);
        const href = linkFor?.(s.key);
        const sales = s.group === "payment";
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink-900">
                <span className="mr-1.5 text-ink-400">{i + 1}.</span>
                {s.label}
              </span>
              <span className="tabular shrink-0 font-bold text-forest-900">
                {s.count.toLocaleString("en-IN")} <span className="text-xs font-medium text-ink-400">· {Math.round((s.count / top) * 1000) / 10}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream-100">
              <div className={"h-full rounded-full " + (sales ? "bg-sun-400" : "bg-forest-700")} style={{ width: width + "%", opacity: sales ? 1 : 1 - i * 0.07 }} />
            </div>
          </>
        );
        return (
          <li key={s.key}>
            {i > 0 && drop > 0 && (
              <p className="tabular py-1 pl-5 text-[11px] font-semibold text-danger">
                ↓ {ofPrev}% continued · {drop.toLocaleString("en-IN")} dropped
              </p>
            )}
            {i > 0 && drop <= 0 && <div className="h-2" />}
            {href ? (
              <Link href={href} className="block rounded-xl p-2 -mx-2 hover:bg-cream-50">{content}</Link>
            ) : (
              <div className="p-2 -mx-2">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function BarList({ rows, format = (n: number) => n.toLocaleString("en-IN"), tone = "bg-leaf-200" }: { rows: [string, number][]; format?: (n: number) => string; tone?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <Empty />;
  return (
    <ul className="space-y-1.5">
      {rows.map(([k, v]) => (
        <li key={k} className="relative overflow-hidden rounded-lg">
          <div className={"absolute inset-y-0 left-0 rounded-lg " + tone} style={{ width: (v / max) * 100 + "%" }} />
          <div className="relative flex min-h-9 items-center justify-between gap-3 px-3 text-sm">
            <span className="truncate font-medium text-ink-900">{k}</span>
            <span className="tabular font-bold text-forest-900">{format(v)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Columns({ data, height = 120, keys }: { data: { label: string; values: number[] }[]; height?: number; keys: { label: string; tone: string }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end gap-px" title={`${d.label}: ${d.values.join(" / ")}`}>
            {d.values.map((v, j) => (
              <div key={j} className={"flex-1 rounded-t-sm " + keys[j].tone} style={{ height: Math.max(v ? 3 : 0, (v / max) * 100) + "%" }} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-600">
        {keys.map((k) => (
          <span key={k.label} className="inline-flex items-center gap-1.5">
            <span className={"size-2.5 rounded-sm " + k.tone} /> {k.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: (string | number | React.ReactNode)[][] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className={"w-full text-sm " + (head.length > 4 ? "min-w-[460px]" : "")}>
        <thead>
          <tr className="border-b border-cream-200 text-left text-xs text-ink-400">
            {head.map((h, i) => (
              <th key={h} className={"py-2 pr-3 font-semibold " + (i ? "text-right" : "")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-cream-100 last:border-0">
              {r.map((c, j) => (
                <td key={j} className={"py-2.5 pr-3 " + (j ? "text-right font-semibold text-forest-900" : "font-medium text-ink-900")}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ text = "No data for this period yet." }: { text?: string }) {
  return <p className="rounded-xl bg-cream-50 p-4 text-center text-sm text-ink-400">{text}</p>;
}

export const inr = formatINR;
export const timeAgo = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
};
export const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const hours = (h: number) => (h < 1 ? Math.round(h * 60) + " min" : h < 48 ? Math.round(h * 10) / 10 + " h" : Math.round(h / 24) + " days");
