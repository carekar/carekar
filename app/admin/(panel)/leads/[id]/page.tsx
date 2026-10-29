import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getAdmin } from "@/lib/admin";
import { readDB, leadStatuses, statusLabel, type Lead, type LeadStatus } from "@/lib/store";
import { journey } from "@/lib/analytics";
import { Card, StatusPill, inr, istDateTime, timeAgo } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { planByVehicle } from "@/lib/site";
import { isOneTime, leadPlanLabel, leadPriceLabel } from "@/lib/leads";
import { addNote, createPaymentLink, updateStatus } from "../../../actions";

export const metadata = { title: "Lead" };

// availability_confirmed → payment_link_sent happens by creating a Razorpay link below
const nextStep: Partial<Record<LeadStatus, { to: LeadStatus; label: string }>> = {
  new: { to: "contacted", label: "Mark as contacted" },
  contacted: { to: "availability_confirmed", label: "Confirm availability" },
  payment_link_sent: { to: "active", label: "Paid another way (cash / UPI) · activate" },
};

/** Total for one month (or the one-time cleaning) across all vehicles. */
const amountDue = (l: Lead) => l.planPrice * (l.vehicleCount || 1);

function paymentMessage(l: Lead) {
  const first = l.name.split(" ")[0];
  const what = isOneTime(l) ? "one-time car cleaning" : `${planByVehicle(l.vehicle)?.label} plan`;
  return `Hi ${first}, here is your secure Razorpay payment link for your Carekar ${what} (${inr(amountDue(l))}${isOneTime(l) ? "" : " for the month"}): ${l.paymentLinkUrl ?? "[payment link]"}`;
}

const eventLabel: Record<string, string> = {
  session_start: "Visit started",
  page_view: "Viewed page",
  engaged: "Engaged with page",
  scroll_depth: "Scrolled",
  section_view: "Saw section",
  vehicle_selected: "Selected vehicle",
  plan_viewed: "Viewed plan price",
  all_plans_expanded: "Compared all plans",
  book_clicked: "Tapped Book",
  form_opened: "Opened booking form",
  form_started: "Started form",
  form_step_viewed: "Viewed form step",
  form_step_completed: "Completed form step",
  form_field_error: "Field error",
  form_back: "Went back in form",
  form_resumed: "Resumed saved form",
  form_abandoned: "Left the form",
  society_not_listed: "Typed unlisted society",
  callback_requested: "Requested callback",
  lead_submitted: "Submitted booking",
  whatsapp_clicked: "Tapped WhatsApp",
  call_clicked: "Tapped Call",
  faq_opened: "Opened FAQ",
  lead_status_changed: "Status changed by team",
};
const quiet = new Set(["page_view", "scroll_depth", "section_view", "form_step_viewed"]);

function templates(l: Lead) {
  const first = l.name.split(" ")[0];
  const plan = planByVehicle(l.vehicle);
  const what = isOneTime(l) ? `one-time car cleaning (${plan?.label}) is ${inr(l.planPrice)}` : `${plan?.label} plan is ${inr(l.planPrice)}/month`;
  return [
    ["Booking received", `Hi ${first}, thank you for booking with Carekar (Ref ${l.ref}). We're checking availability in ${l.society} and will confirm shortly.`],
    ["Availability confirmed", `Good news ${first}! Carekar is available in ${l.society}. Your ${what}. We'll share a secure payment link to confirm your booking.`],
    ["Payment link", paymentMessage(l)],
    ["Payment received", `Thank you ${first}! Payment received. Your Carekar cleaning ${isOneTime(l) ? "is booked for" : "starts on"} ${l.startDate}. We'll keep you updated here on WhatsApp.`],
    ["Not serviceable yet", `Hi ${first}, thank you for your interest in Carekar. We don't service ${l.society} yet, but we'll message you as soon as we launch there.`],
  ] as const;
}

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const db = await readDB();
  const canEdit = can(await getAdmin(), "editor");
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) notFound();
  const plan = planByVehicle(lead.vehicle);
  const j = journey(db, lead.visitorId);
  const payments = db.payments.filter((p) => p.leadId === lead.id);
  const wa = lead.whatsapp || lead.mobile;
  const step = nextStep[lead.status];
  // a first link once availability is confirmed, or next month's link for an active plan
  const canCharge = ["availability_confirmed", "payment_link_sent"].includes(lead.status) || (lead.status === "active" && !isOneTime(lead));

  const timeline = [
    ...lead.history.map((h) => ({ at: h.at, text: h.from ? `${statusLabel[h.from]} → ${statusLabel[h.to]}` : "Lead created", note: h.note, kind: "status" as const })),
    ...lead.teamNotes.map((n) => ({ at: n.at, text: n.text, note: undefined, kind: "note" as const })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const sessionsById = new Map(j.sessions.map((s) => [s.id, s]));
  const journeyEvents = j.events.filter((e) => !quiet.has(e.name));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/leads" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-forest-700">
        <Icon name="arrowLeft" className="size-4" /> Leads
      </Link>

      <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold text-forest-900">{lead.name}</h1>
            <p className="text-sm text-ink-400">
              {lead.ref} · {istDateTime(lead.createdAt)} ({timeAgo(lead.createdAt)})
            </p>
          </div>
          <StatusPill status={lead.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-leaf-100 px-3 py-1 font-semibold text-forest-900">
            {leadPlanLabel(lead)} · {leadPriceLabel(lead)}{lead.vehicleCount > 1 ? ` × ${lead.vehicleCount}` : ""}
          </span>
          {lead.callbackRequested && <span className="rounded-full bg-sun-400/30 px-3 py-1 font-semibold text-forest-900">📞 Callback requested</span>}
          {lead.demo && <span className="rounded-full bg-cream-200 px-3 py-1 text-ink-600">Demo</span>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:+91${lead.mobile}`} className="btn-outline !min-h-12 text-sm"><Icon name="phone" className="size-4" /> Call</a>
          <a href={`https://wa.me/91${wa}`} target="_blank" rel="noopener" className="btn-wa !min-h-12 text-sm"><Icon name="whatsapp" className="size-4" /> WhatsApp</a>
        </div>
        {error && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-danger" role="alert">
            <Icon name="alert" className="size-5 shrink-0" /> {error}
          </p>
        )}
        {lead.paymentLinkUrl && (
          <div className="mt-3 rounded-xl bg-leaf-100 p-3">
            <p className="text-sm font-semibold text-forest-900">Payment link · {inr(amountDue(lead))} · awaiting payment</p>
            <a href={lead.paymentLinkUrl} target="_blank" rel="noopener" className="block break-all text-sm text-forest-700 underline">{lead.paymentLinkUrl}</a>
            <a href={`https://wa.me/91${wa}?text=${encodeURIComponent(paymentMessage(lead))}`} target="_blank" rel="noopener" className="btn-wa mt-2 w-full !min-h-12 text-sm">
              <Icon name="whatsapp" className="size-4" /> Send link on WhatsApp
            </a>
            <p className="mt-2 text-xs text-ink-600">The lead becomes Active automatically once Razorpay confirms the payment.</p>
          </div>
        )}
        {canEdit && canCharge && (
          <form action={createPaymentLink} className="mt-2">
            <input type="hidden" name="id" value={lead.id} />
            <button className={(lead.paymentLinkUrl ? "btn-outline" : "btn-primary") + " w-full text-sm"}>
              <Icon name="rupee" className="size-4" />
              {lead.paymentLinkUrl ? "Create a new link" : lead.status === "active" ? `Create next month's link · ${inr(amountDue(lead))}` : `Create payment link · ${inr(amountDue(lead))}`}
            </button>
          </form>
        )}
        {step && canEdit && (
          <form action={updateStatus} className="mt-2">
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="status" value={step.to} />
            <button className={(lead.paymentLinkUrl ? "btn-outline" : "btn-primary") + " w-full text-sm"}>{step.label} <Icon name="arrowRight" className="size-4" /></button>
          </form>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <Card title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                ["Mobile", "+91 " + lead.mobile],
                ["WhatsApp", lead.whatsapp ? "+91 " + lead.whatsapp : "Same as mobile"],
                ["Google login", lead.customerEmail ? [lead.customerName, lead.customerEmail].filter(Boolean).join(" · ") : "Not logged in (callback request)"],
                ["Vehicle", [plan?.label, lead.vehicleModel, lead.vehicleColour].filter(Boolean).join(" · ")],
                ["Reg. no.", lead.registrationNo],
                ["Society", lead.society],
                ["Tower / flat", lead.towerFlat],
                ["Locality", lead.locality],
                ["Parking", [lead.parkingType, lead.parkingSlot].filter(Boolean).join(" · ")],
                [isOneTime(lead) ? "Cleaning date" : "Start date", lead.startDate],
                ["Preferred time", lead.preferredTime],
                ["Heard from", lead.heardFrom],
                ["Notes", lead.notes],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-400">{k}</dt>
                    <dd className="break-words font-medium text-ink-900">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          <Card title="WhatsApp templates">
            <ul className="space-y-2">
              {templates(lead).map(([label, text]) => (
                <li key={label}>
                  <a href={`https://wa.me/91${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener" className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-200 px-3 py-2 hover:border-leaf-400">
                    <Icon name="whatsapp" className="size-5 shrink-0 text-[#1faa53]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">{label}</span>
                      <span className="block truncate text-xs text-ink-400">{text}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          {canEdit ? (
          <Card title="Change status">
            <form action={updateStatus} className="space-y-2">
              <input type="hidden" name="id" value={lead.id} />
              <select name="status" defaultValue={lead.status} className="field">
                {leadStatuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
              <input name="lostReason" placeholder="Reason / note (for Lost, Cancelled, Not serviceable)" className="field" />
              <button className="btn-outline w-full text-sm">Update status</button>
            </form>
          </Card>
          ) : (
            <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-ink-600">View-only access. Ask the admin for editor access to change status or add notes.</p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Source & device">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                ["First touch", [lead.firstTouch?.channel, lead.firstTouch?.campaign].filter(Boolean).join(" · ")],
                ["Last touch", [lead.lastTouch?.channel, lead.lastTouch?.campaign].filter(Boolean).join(" · ")],
                ["Device", [lead.device, lead.inApp && `${lead.inApp} in-app`].filter(Boolean).join(" · ")],
                ["Visits before booking", String(j.sessions.length || "—")],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-400">{k}</dt>
                    <dd className="font-medium text-ink-900">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {payments.length > 0 && (
            <Card title="Payments">
              <ul className="space-y-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <span>{istDateTime(p.at)} · {p.method.replace("_", " ")}</span>
                    <span className={"font-bold " + (p.status === "captured" ? "text-forest-700" : "text-danger")}>
                      {p.status === "captured" ? inr(p.amount) : "Failed"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Activity">
            {canEdit && (
              <form action={addNote} className="mb-4 flex gap-2">
                <input type="hidden" name="id" value={lead.id} />
                <input name="text" placeholder="Add a note…" className="field" />
                <button className="btn-primary !px-4 text-sm" aria-label="Add note"><Icon name="plus" /></button>
              </form>
            )}
            <ol className="space-y-3">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={"mt-1.5 size-2.5 shrink-0 rounded-full " + (t.kind === "note" ? "bg-sun-400" : "bg-forest-700")} />
                  <div>
                    <p className="font-medium text-ink-900">{t.text}</p>
                    {t.note && <p className="text-ink-600">{t.note}</p>}
                    <p className="text-xs text-ink-400">{istDateTime(t.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Journey before booking">
            {journeyEvents.length ? (
              <ol className="relative space-y-3 border-l-2 border-cream-200 pl-4">
                {journeyEvents.map((e, i) => {
                  const s = e.name === "session_start" ? sessionsById.get(e.sessionId) : undefined;
                  const detail = s
                    ? [s.channel, s.campaign, s.device, s.inApp && s.inApp + " app"].filter(Boolean).join(" · ")
                    : Object.entries(e.props || {}).filter(([k]) => !["duration_ms", "price"].includes(k)).map(([, v]) => String(v)).join(" · ");
                  return (
                    <li key={i} className="relative text-sm">
                      <span className={"absolute -left-[22px] top-1.5 size-2.5 rounded-full " + (e.name === "session_start" ? "bg-forest-700" : e.name === "lead_submitted" ? "bg-sun-400" : "bg-leaf-200")} />
                      <p className={e.name === "session_start" || e.name === "lead_submitted" ? "font-bold text-forest-900" : "font-medium text-ink-900"}>
                        {eventLabel[e.name] ?? e.name}
                      </p>
                      <p className="text-xs text-ink-400">{istDateTime(e.at)}{detail ? " · " + detail : ""}</p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-ink-400">No tracked visits linked to this lead.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
