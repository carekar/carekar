import { readDB } from "@/lib/store";
import { requireAdmin } from "@/lib/admin";
import { getConfig } from "@/lib/settings";
import { api } from "@/lib/api";
import { Card, PageHeader } from "@/components/admin/ui";
import { LinkBuilder } from "@/components/admin/LinkBuilder";
import { Icon } from "@/components/Icon";
import { site } from "@/lib/site";
import { clearDemo, restoreDemo, saveSettings } from "../../actions";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin("editor");
  const { saved } = await searchParams;
  const [db, config, health] = await Promise.all([
    readDB(),
    getConfig(),
    api<{ database: "postgres" | "file"; alerts: boolean }>("/health", { token: null }).catch(() => null),
  ]);
  const demo = db.leads.filter((l) => l.demo).length;
  const hidden = new Set(db.settings?.hiddenPlans || []);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Settings" subtitle="Plans, contact details, societies, tracking links" />

      <Card title="Tracking link & QR builder">
        <LinkBuilder baseUrl={site.url} />
      </Card>

      <form action={saveSettings} className="space-y-4">
        {saved && (
          <p className="flex items-center gap-2 rounded-xl bg-leaf-100 px-4 py-3 text-sm font-semibold text-forest-800">
            <Icon name="checkCircle" className="size-5" /> Saved. The website now shows these details.
          </p>
        )}

        <Card title="Plans & prices (per month)">
          <ul className="divide-y divide-cream-100">
            {config.allPlans.map((p) => (
              <li key={p.vehicle} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="min-w-28 flex-1 font-semibold text-ink-900">{p.label}</span>
                <label className="flex items-center gap-2">
                  <span className="text-ink-400">₹</span>
                  <input name={"price_" + p.vehicle} type="number" inputMode="numeric" min={1} max={100000} required defaultValue={p.price} className="field !min-h-11 w-28 !py-2" aria-label={`${p.label} price`} />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm text-ink-600">
                  <input type="checkbox" name={"hidden_" + p.vehicle} defaultChecked={hidden.has(p.vehicle)} className="size-5 accent-forest-700" />
                  Hide on site
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-400">New prices apply to new bookings. Existing leads keep the price they booked at.</p>
        </Card>

        <Card title="One-time car cleaning (interior + exterior)">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="min-w-28 flex-1 text-sm text-ink-600">Same price for every car type. Not offered for bikes.</span>
            <label className="flex items-center gap-2">
              <span className="text-ink-400">₹</span>
              <input name="oneTimePrice" type="number" inputMode="numeric" min={1} max={100000} required defaultValue={config.oneTime.price} className="field !min-h-11 w-28 !py-2" aria-label="One-time cleaning price" />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-ink-600">
              <input type="checkbox" name="oneTimeHidden" defaultChecked={config.oneTime.hidden} className="size-5 accent-forest-700" />
              Hide on site
            </label>
          </div>
        </Card>

        <Card title="Contact details">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Phone (10 digits)</span>
              <input name="phone" type="tel" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" required defaultValue={config.contact.phone} className="field" />
            </label>
            <label className="block">
              <span className="field-label">WhatsApp (10 digits)</span>
              <input name="whatsapp" type="tel" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" required defaultValue={config.contact.whatsapp} className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">Email (leave empty to hide on site)</span>
              <input name="email" type="email" inputMode="email" defaultValue={config.contact.email} className="field" />
            </label>
          </div>
        </Card>

        <Card title={`Society suggestions · ${config.societies.length}`}>
          <label className="block">
            <span className="field-label">One society per line (shown as suggestions in the booking form)</span>
            <textarea name="societies" rows={8} defaultValue={config.societies.join("\n")} className="field !h-auto font-mono !text-sm" />
          </label>
        </Card>

        <div className="pb-safe sticky bottom-16 z-10 -mx-4 bg-cream-50/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:px-0">
          <button className="btn-primary w-full md:w-auto">Save settings</button>
        </div>
      </form>

      <Card title="System">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-400">API</dt>
          <dd className="font-medium">{health ? "Online" : "Not reachable"}</dd>
          <dt className="text-ink-400">Database</dt>
          <dd className="font-medium">
            {health?.database === "postgres" ? "Supabase Postgres via Prisma (live)" : "Local file (preview only, add DATABASE_URL to server/.env)"}
          </dd>
          <dt className="text-ink-400">Logins</dt>
          <dd className="font-medium">Shared team password</dd>
          <dt className="text-ink-400">Lead alerts</dt>
          <dd className="font-medium">{health?.alerts ? "Telegram on" : "Off (add Telegram bot keys to server/.env)"}</dd>
        </dl>
      </Card>

      <div id="demo" className="scroll-mt-24">
        <Card title="Demo data">
          <p className="text-sm text-ink-600">
            {demo ? `${demo} demo leads and their visits/payments are loaded so you can preview the dashboard.` : "No demo data loaded."} Real bookings are never affected.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demo > 0 && <form action={clearDemo}><button className="btn-outline !min-h-11 text-sm text-danger">Clear demo data</button></form>}
            <form action={restoreDemo}><button className="btn-outline !min-h-11 text-sm">{demo ? "Regenerate demo data" : "Load demo data"}</button></form>
          </div>
        </Card>
      </div>
    </div>
  );
}
