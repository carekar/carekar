import { requireAdmin } from "@/lib/admin";
import { api } from "@/lib/api";
import { roleLabel, type TeamMember } from "@/lib/types";
import { Card, PageHeader, timeAgo } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { removeTeamMember, saveTeamMember } from "../../actions";

export const metadata = { title: "Team" };

const roles = [
  { value: "viewer", label: "Viewer", text: "Can see the dashboard, leads, funnel and payments. Can't change anything." },
  { value: "editor", label: "Editor", text: "Everything a viewer can, plus change lead status, add notes, export CSV and edit settings." },
] as const;

export default async function Team({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const me = await requireAdmin("super_admin");
  const { saved, error } = await searchParams;
  const { superAdmins, members } = await api<{ superAdmins: string[]; members: TeamMember[] }>("/api/admin/team");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Team" subtitle="Who can log in to this dashboard with Google" />

      {saved && (
        <p className="flex items-center gap-2 rounded-xl bg-leaf-100 px-4 py-3 text-sm font-semibold text-forest-800">
          <Icon name="checkCircle" className="size-5" /> Saved. Changes apply on their next page load.
        </p>
      )}
      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-danger" role="alert">
          <Icon name="alert" className="size-5" /> {error}
        </p>
      )}

      <Card title="Give access">
        <form action={saveTeamMember} className="space-y-4">
          <label className="block">
            <span className="field-label">Google / Gmail address</span>
            <input name="email" type="email" inputMode="email" required autoComplete="off" placeholder="name@gmail.com" className="field" />
          </label>
          <fieldset>
            <legend className="field-label">Access</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((r, i) => (
                <label key={r.value} className="flex cursor-pointer gap-3 rounded-xl border border-cream-200 bg-white p-3 has-[:checked]:border-forest-700 has-[:checked]:bg-leaf-100/40">
                  <input type="radio" name="role" value={r.value} defaultChecked={i === 0} className="mt-1 size-5 shrink-0 accent-forest-700" />
                  <span>
                    <span className="block font-bold text-ink-900">{r.label}</span>
                    <span className="block text-sm text-ink-600">{r.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn-primary w-full sm:w-auto sm:px-8">Give access</button>
          <p className="text-xs text-ink-400">They log in at /admin with &quot;Continue with Google&quot; using this exact address. To change someone&apos;s access, add them again with the new role.</p>
        </form>
      </Card>

      <Card title={`People with access · ${superAdmins.length + members.length}`}>
        <ul className="divide-y divide-cream-100">
          {superAdmins.map((email) => (
            <li key={email} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink-900">{email}{email === me.email ? " (you)" : ""}</span>
                <span className="block text-xs text-ink-400">Full access, manages the team</span>
              </span>
              <span className="rounded-full bg-forest-900 px-2.5 py-1 text-xs font-bold text-white">{roleLabel.super_admin}</span>
            </li>
          ))}
          {members.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink-900">{m.name ? `${m.name} · ` : ""}{m.email}</span>
                <span className="block text-xs text-ink-400">
                  Added {timeAgo(m.createdAt)} · {m.lastLoginAt ? `last login ${timeAgo(m.lastLoginAt)}` : "hasn't logged in yet"}
                </span>
              </span>
              <form action={saveTeamMember} className="flex items-center gap-2">
                <input type="hidden" name="email" value={m.email} />
                <select name="role" defaultValue={m.role} className="field !min-h-10 !w-auto !py-1.5 text-sm" aria-label={`Access for ${m.email}`}>
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button className="btn-outline !min-h-10 !px-3 text-sm">Save</button>
              </form>
              <form action={removeTeamMember}>
                <input type="hidden" name="email" value={m.email} />
                <button className="min-h-10 rounded-full px-3 text-sm font-semibold text-danger hover:bg-red-50" aria-label={`Remove ${m.email}`}>
                  Remove
                </button>
              </form>
            </li>
          ))}
          {!members.length && <li className="py-3 text-sm text-ink-600">No one else yet. Add a Gmail address above.</li>}
        </ul>
      </Card>
    </div>
  );
}
