import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { TrackedLink } from "@/components/site/TrackedLink";
import { findPlan, serviceLabel, waHref } from "@/lib/config";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = { title: "Booking received", robots: { index: false } };

type Params = { ref?: string; n?: string; v?: string; s?: string; c?: string; t?: string };

export default async function ThankYou({ searchParams }: { searchParams: Promise<Params> }) {
  const { ref = "", n = "", v, s = "", c, t } = await searchParams;
  const config = await getConfig();
  const plan = findPlan(config, v);
  const callback = c === "1";
  const single = t === "one_time";
  const message = `Hi Carekar, I just booked${ref ? ` — Ref ${ref}` : ""}${plan ? `, ${serviceLabel(config, single ? "one_time" : "subscription", v)}` : ""}${s ? `, ${s}` : ""}.`;

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-8">
      <div className="animate-rise text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-leaf-100 text-forest-700">
          <Icon name="checkCircle" className="size-11" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-[32px] font-extrabold leading-tight text-forest-900">
          {callback ? "We'll call you soon" : "Booking received"}
          {n ? `, ${n}!` : "!"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-600">
          Our team will confirm availability{s ? ` in ${s}` : ""} and reach you on WhatsApp or phone shortly.
        </p>
        {ref && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-900 shadow-[var(--shadow-card)]">
            Booking reference <span className="tabular font-display text-base font-extrabold">{ref}</span>
          </p>
        )}
      </div>

      <TrackedLink href={waHref(config.contact.whatsapp, message)} event="whatsapp_clicked" props={{ location: "thank_you" }} className="btn-wa mt-8 w-full">
        <Icon name="whatsapp" /> Message us on WhatsApp
      </TrackedLink>

      <div className="mt-8 rounded-2xl bg-white p-5">
        <p className="font-bold text-forest-900">What happens next</p>
        <ol className="mt-4 space-y-4">
          {[
            ["Availability check", "We confirm we service your society."],
            ["Payment link on WhatsApp", "Pay securely via UPI, card or netbanking."],
            single ? ["Cleaning visit", "On your chosen date, interior + exterior."] : ["Cleaning starts", "From your preferred start date."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-700 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-ink-900">{t}</p>
                <p className="text-sm text-ink-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
        <Image src="/images/exterior-wash.webp" alt="" fill sizes="(min-width:640px) 576px, 100vw" className="object-cover" />
      </div>

      {!callback && (
        <Link href="/account" className="btn-primary mt-6 w-full">
          <Icon name="list" className="size-[18px]" /> View my bookings
        </Link>
      )}
      <Link href="/" className="btn-outline mt-3 w-full">Back to home</Link>
    </div>
  );
}
