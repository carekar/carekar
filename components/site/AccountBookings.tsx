"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatINR } from "@/lib/site";
import { serviceLabel, waHref } from "@/lib/config";
import { customerStatus, type CustomerBooking } from "@/lib/types";
import { track } from "@/lib/track";
import { useConfig } from "./ConfigProvider";
import { LoginPanel } from "./LoginPanel";
import { PayButton } from "./PayButton";
import { useCustomer } from "./useCustomer";

const DAY = 86400000;

const fmtDate = (iso?: string) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Monthly plans renew 30 days after the last successful payment. */
function nextRenewal(b: CustomerBooking) {
  const last = b.payments.filter((p) => p.status === "captured").sort((x, y) => y.at.localeCompare(x.at))[0];
  return last ? new Date(Date.parse(last.at) + 30 * DAY).toISOString() : undefined;
}

const toneClass = {
  good: "bg-leaf-100 text-forest-800",
  pending: "bg-sun-400/25 text-forest-900",
  muted: "bg-cream-100 text-ink-600",
  bad: "bg-red-50 text-danger",
};

export function AccountBookings() {
  const config = useConfig();
  const account = useCustomer(true, "account");
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const token = await account.token();
      const res = await fetch("/api/me/bookings", { headers: { authorization: "Bearer " + token }, cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't load your bookings");
      setBookings(json.bookings);
      track("account_viewed", { bookings: json.bookings.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your bookings");
    }
  }, [account.token]);

  const uid = account.customer?.uid;
  useEffect(() => {
    setBookings(null);
    if (uid) load();
  }, [uid, load]);

  if (account.loading) return <Skeleton />;
  if (!account.customer) return <LoginPanel next="/account" />;

  const subscriptions = (bookings || []).filter((b) => b.service === "subscription" && b.status === "active");
  const help = (ref?: string) => waHref(config.contact.whatsapp, `Hi Carekar, I need help with my booking${ref ? ` ${ref}` : ""}.`);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-tight text-forest-900">My bookings</h1>
          <p className="truncate text-sm text-ink-600">{account.customer.name ? `${account.customer.name} · ` : ""}{account.customer.email}</p>
        </div>
        <button type="button" onClick={account.signOut} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-forest-700">
          <Icon name="logout" className="size-4" /> Log out
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger" role="alert">
          <Icon name="alert" className="size-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {!bookings && !error && <Skeleton list />}

      {bookings && subscriptions.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-400">Running subscriptions</h2>
          <ul className="space-y-3">
            {subscriptions.map((b) => {
              const renewal = nextRenewal(b);
              return (
                <li key={b.ref} className="rounded-2xl bg-forest-900 p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/70">{b.ref}</p>
                      <p className="text-lg font-bold">{serviceLabel(config, b.service, b.vehicle)}{b.vehicleModel ? ` · ${b.vehicleModel}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-leaf-400 px-3 py-1 text-xs font-bold text-forest-900">Active</span>
                  </div>
                  <p className="font-display tabular mt-3 text-3xl font-extrabold">
                    {formatINR(b.planPrice * (b.vehicleCount || 1))}<span className="font-sans text-sm font-medium text-white/70">/month</span>
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-white/60">Started</dt>
                      <dd className="font-semibold">{fmtDate(b.startDate)}</dd>
                    </div>
                    {renewal && (
                      <div>
                        <dt className="text-white/60">Next renewal</dt>
                        <dd className="font-semibold">{fmtDate(renewal)}</dd>
                      </div>
                    )}
                    <div className="col-span-2">
                      <dt className="text-white/60">Location</dt>
                      <dd className="font-semibold">{[b.society, b.towerFlat].filter(Boolean).join(", ")}</dd>
                    </div>
                  </dl>
                  <a href={help(b.ref)} target="_blank" rel="noopener" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-leaf-200">
                    <Icon name="whatsapp" className="size-4" /> Pause, change or cancel on WhatsApp
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {bookings && bookings.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-400">All bookings · {bookings.length}</h2>
          <ul className="space-y-3">
            {bookings.map((b) => {
              const st = customerStatus[b.status];
              const single = b.service === "one_time";
              const paid = b.payments.filter((p) => p.status === "captured");
              return (
                <li key={b.ref} className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900">{serviceLabel(config, b.service, b.vehicle)}</p>
                      <p className="text-xs text-ink-400">
                        {b.ref} · Booked {fmtDate(b.createdAt)}
                        {b.callbackRequested ? " · Callback request" : ""}
                      </p>
                    </div>
                    <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-bold " + toneClass[st.tone]}>
                      {single && b.status === "active" ? "Confirmed" : st.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-600">{single && b.status === "active" ? "Your cleaning visit is scheduled." : st.detail}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt className="text-ink-400">Price</dt>
                      <dd className="tabular font-semibold text-ink-900">
                        {formatINR(b.planPrice * (b.vehicleCount || 1))}{single ? " one-time" : "/month"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">{single ? "Cleaning date" : "Start date"}</dt>
                      <dd className="font-semibold text-ink-900">{fmtDate(b.startDate)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-ink-400">Location</dt>
                      <dd className="font-semibold text-ink-900">{[b.society, b.towerFlat].filter(Boolean).join(", ")}</dd>
                    </div>
                    {paid.length > 0 && (
                      <div className="col-span-2">
                        <dt className="text-ink-400">Payments</dt>
                        <dd className="font-semibold text-ink-900">
                          {paid.length} paid · last {formatINR(paid[paid.length - 1].amount)} on {fmtDate(paid[paid.length - 1].at)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {b.payable && <PayButton bookingRef={b.ref} amount={b.planPrice * (b.vehicleCount || 1)} token={account.token} onPaid={load} />}
                  <a href={help(b.ref)} target="_blank" rel="noopener" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest-700">
                    <Icon name="whatsapp" className="size-4" /> Questions about this booking
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {bookings && bookings.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-leaf-100 text-forest-700">
            <Icon name="calendar" className="size-7" />
          </span>
          <p className="mt-4 text-lg font-bold text-forest-900">No bookings yet</p>
          <p className="mt-1 text-sm text-ink-600">Book a monthly plan or a one-time cleaning. It takes less than a minute.</p>
          <div className="mt-5 grid gap-2">
            <Link href="/book?service=subscription" className="btn-primary w-full">See monthly plans</Link>
            {!config.oneTime.hidden && (
              <Link href="/book?service=one_time" className="btn-outline w-full">One-time cleaning · {formatINR(config.oneTime.price)}</Link>
            )}
          </div>
        </div>
      )}

      {bookings && (
        <p className="text-center text-xs leading-relaxed text-ink-400">
          Bookings appear here when you were logged in while booking. Missing one?{" "}
          <a href={help()} target="_blank" rel="noopener" className="font-semibold text-forest-700 underline">WhatsApp us</a>.
        </p>
      )}
    </div>
  );
}

function Skeleton({ list }: { list?: boolean }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {!list && <div className="h-9 w-48 animate-pulse rounded bg-cream-100" />}
      {[0, 1].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  );
}
