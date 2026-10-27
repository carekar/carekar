import Image from "next/image";
import { Icon, type IconName } from "@/components/Icon";
import { PlanPicker } from "@/components/site/PlanPicker";
import { Faq } from "@/components/site/Faq";
import { TrackedLink } from "@/components/site/TrackedLink";
import { faqs, howItWorks, site } from "@/lib/site";
import { telHref, waHref } from "@/lib/config";
import { getConfig } from "@/lib/settings";

const features: { icon: IconName; title: string; text: string }[] = [
  { icon: "calendar", title: "26 exterior visits", text: "Scheduled cleaning every month" },
  { icon: "seat", title: "Weekly interior", text: "Inside cleaning for cars" },
  { icon: "repeat", title: "Monthly plan", text: "Simple subscription, no hassle" },
  { icon: "whatsapp", title: "WhatsApp updates", text: "Know when your car is done" },
];

const reasons: { icon: IconName; text: string }[] = [
  { icon: "repeat", text: "Convenient monthly subscriptions" },
  { icon: "calendar", text: "Regular scheduled cleaning" },
  { icon: "seat", text: "Weekly interior cleaning for cars" },
  { icon: "shield", text: "Trained and verified cleaning staff" },
  { icon: "whatsapp", text: "Easy WhatsApp communication" },
  { icon: "building", text: "Designed for residential societies and apartments" },
];

export default async function Home() {
  const { contact, plans, oneTime } = await getConfig();
  const telLink = telHref(contact.phone);
  const waLink = (text: string) => waHref(contact.whatsapp, text);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: "Carekar",
        slogan: site.tagline,
        telephone: "+91" + contact.phone,
        areaServed: site.areaFull,
        address: { "@type": "PostalAddress", addressLocality: site.area, addressRegion: "Uttar Pradesh", addressCountry: "IN" },
        makesOffer: [
          ...plans.map((p) => ({
            "@type": "Offer",
            name: `${p.label} cleaning plan`,
            price: p.price,
            priceCurrency: "INR",
            priceSpecification: { "@type": "UnitPriceSpecification", price: p.price, priceCurrency: "INR", unitText: "MONTH" },
          })),
          ...(oneTime.hidden ? [] : [{ "@type": "Offer", name: `${oneTime.label} (interior + exterior)`, price: oneTime.price, priceCurrency: "INR" }]),
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────── Hero ───────── */}
      <section data-section="hero" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-leaf-100 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-7 md:grid-cols-2 md:items-center md:gap-12 md:pb-20 md:pt-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1.5 text-xs font-bold text-forest-900">
              <Icon name="mapPin" className="size-3.5" strokeWidth={2.25} /> Launching in {site.area}
            </span>
            <h1 className="mt-4 text-[44px] font-extrabold leading-[1.02] text-forest-900 md:text-6xl">
              Your Car.
              <br />
              <span className="relative inline-block text-forest-700">
                Our Care.
                <svg viewBox="0 0 200 12" className="absolute -bottom-1.5 left-0 h-3 w-full text-sun-400" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 9C50 3 150 2 198 6" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-600">
              Premium, hassle-free vehicle cleaning at your doorstep. Enjoy a cleaner vehicle without the daily effort.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href="/book" event="book_clicked" props={{ location: "hero" }} className="btn-primary sm:px-8">
                Book Your Plan <Icon name="arrowRight" className="size-[18px]" />
              </TrackedLink>
              <TrackedLink
                href={waLink("Hi Carekar, I'd like to know more about your cleaning plans.")}
                event="whatsapp_clicked"
                props={{ location: "hero" }}
                className="btn-outline"
              >
                <Icon name="whatsapp" className="size-5 text-[#1faa53]" /> Chat on WhatsApp
              </TrackedLink>
            </div>
          </div>

          <div className="relative animate-rise [animation-delay:120ms]">
            <div className="relative aspect-square overflow-hidden rounded-[28px] shadow-[var(--shadow-card)] md:aspect-[4/4.6]">
              <Image
                src="/images/hero-carekar.webp"
                alt="Carekar team member cleaning a car in a residential society"
                fill
                priority
                sizes="(min-width:768px) 50vw, 100vw"
                className="object-cover object-[center_30%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-900/45 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[var(--shadow-card)] sm:right-auto">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-leaf-100 text-forest-700">
                <Icon name="sparkles" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-forest-900">Plans from ₹249/month</p>
                <p className="text-xs text-ink-600">Cars, SUVs, luxury & bikes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-4 max-w-6xl px-4 pb-8 md:mt-0">
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:justify-center md:px-0">
            {["Trained & verified staff", "Pay after availability is confirmed", "WhatsApp support", "No hidden charges"].map((t) => (
              <li key={t} className="flex shrink-0 items-center gap-1.5 rounded-full border border-leaf-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-forest-800">
                <Icon name="checkCircle" className="size-4 text-leaf-400" strokeWidth={2.25} /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── What you get ───────── */}
      <section data-section="features" className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-leaf-100/70 p-4 md:p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-forest-700 text-white">
                <Icon name={f.icon} />
              </span>
              <h3 className="mt-3 text-[17px] font-bold leading-tight text-forest-900">{f.title}</h3>
              <p className="mt-1 text-[13px] leading-snug text-ink-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Plans ───────── */}
      <section id="plans" data-section="plans" className="scroll-mt-20 py-10 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="eyebrow">Our monthly plans</p>
          <h2 className="mt-2 text-[32px] font-extrabold leading-tight text-forest-900 md:text-5xl">Choose your vehicle</h2>
          <p className="mt-2 max-w-lg text-ink-600">Simple, transparent pricing. One plan per vehicle, billed monthly.</p>
          <div className="mt-6 md:mt-10">
            <PlanPicker />
          </div>

          {!oneTime.hidden && (
            <article id="one-time" data-section="one_time" className="card mt-6 grid scroll-mt-20 overflow-hidden md:mt-10 md:grid-cols-[2fr_3fr]">
              <div className="relative aspect-[16/9] bg-cream-100 md:aspect-auto">
                <Image src={oneTime.image} alt="Carekar team member cleaning a car in a society's basement parking" fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover object-[62%_center]" />
                <span className="absolute left-3 top-3 rounded-full bg-sun-400 px-3 py-1 text-xs font-bold text-forest-900">No subscription</span>
              </div>
              <div className="flex flex-col p-5 md:p-7">
                <p className="eyebrow">Just once?</p>
                <h3 className="mt-1 text-2xl font-extrabold leading-tight text-forest-900 md:text-3xl">{oneTime.label}</h3>
                <p className="mt-1 text-ink-600">Interior and exterior in a single visit, for any car. Try us before you subscribe.</p>
                <p className="font-display tabular mt-4 text-[40px] font-extrabold leading-none text-forest-900">
                  {"₹" + oneTime.price.toLocaleString("en-IN")}
                  <span className="ml-1 font-sans text-base font-medium text-ink-600">one-time</span>
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-ink-600 sm:grid-cols-2">
                  {oneTime.inclusions.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Icon name="check" className="mt-0.5 size-4 shrink-0 text-leaf-400" strokeWidth={2.5} /> {i}
                    </li>
                  ))}
                </ul>
                <TrackedLink
                  href="/book?service=one_time"
                  event="book_clicked"
                  props={{ location: "one_time_card", service: "one_time" }}
                  className="btn-primary mt-5 w-full md:w-auto md:self-start md:px-8"
                >
                  Book one-time cleaning <Icon name="arrowRight" className="size-[18px]" />
                </TrackedLink>
              </div>
            </article>
          )}
        </div>
      </section>

      {/* ───────── Photo band ───────── */}
      <section data-section="gallery" className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <figure className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] md:col-span-1 md:aspect-[4/5]">
            <Image src="/images/exterior-wash.webp" alt="Exterior cleaning of a car" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-forest-900">Exterior cleaning · 26 visits</figcaption>
          </figure>
          <figure className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] md:aspect-[4/5]">
            <Image src="/images/interior-wipe.webp" alt="Dashboard and steering being wiped" fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-forest-900">Weekly interior</figcaption>
          </figure>
          <figure className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] md:aspect-[4/5]">
            <Image src="/images/interior-seat.webp" alt="Car seat being cleaned" fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-forest-900">Seats & mats</figcaption>
          </figure>
        </div>
      </section>

      {/* ───────── Why choose ───────── */}
      <section data-section="why_us" className="mt-10 bg-forest-900 py-12 text-white md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:items-center md:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun-400">Why choose Carekar?</p>
            <h2 className="mt-2 text-[32px] font-extrabold leading-tight md:text-5xl">A clean car, without the daily effort.</h2>
            <ul className="mt-7 grid gap-3">
              {reasons.map((r) => (
                <li key={r.text} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.06] p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-400/15 text-leaf-400">
                    <Icon name={r.icon} />
                  </span>
                  <span className="text-[15px] font-semibold">{r.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[28px]">
            <Image src="/images/v-suv.webp" alt="Mahindra XUV700 SUV" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-sun-400 px-4 py-2 text-sm font-bold text-forest-900">
              <Icon name="building" className="size-4" strokeWidth={2.25} /> Doorstep service in your society
            </div>
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section id="how" data-section="how_it_works" className="scroll-mt-20 py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-[32px] font-extrabold leading-tight text-forest-900 md:text-5xl">Start in 4 simple steps</h2>
          <ol className="relative mt-8 grid gap-0 md:grid-cols-4 md:gap-6">
            {howItWorks.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 pb-8 last:pb-0 md:flex-col md:pb-0">
                {i < howItWorks.length - 1 && (
                  <span className="absolute left-[23px] top-12 h-[calc(100%-3rem)] w-0.5 bg-leaf-200 md:left-12 md:top-[23px] md:h-0.5 md:w-[calc(100%-1.5rem)]" />
                )}
                <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full bg-forest-700 font-display text-lg font-extrabold text-white ring-4 ring-cream-50">
                  {i + 1}
                </span>
                <div className="pt-1.5 md:pt-0">
                  <h3 className="text-lg font-bold text-forest-900">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Service area ───────── */}
      <section id="area" data-section="service_area" className="scroll-mt-20 px-4 pb-12 md:pb-20">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] bg-cream-100 md:grid-cols-[1fr_1.1fr]">
          <div className="relative aspect-[16/10] md:aspect-auto">
            <Image src="/images/society-towers.webp" alt="Residential towers in Greater Noida" fill sizes="(min-width:768px) 45vw, 100vw" className="object-cover" />
          </div>
          <div className="p-6 md:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1.5 text-xs font-bold text-forest-900">
              <Icon name="mapPin" className="size-3.5" strokeWidth={2.25} /> Service area
            </span>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight text-forest-900 md:text-4xl">Launching in {site.area}</h2>
            <p className="mt-3 leading-relaxed text-ink-600">
              We serve residential societies, apartments and individual homes. Share your society name and our team will confirm availability before you pay anything.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href="/book" event="book_clicked" props={{ location: "service_area" }} className="btn-primary">
                Check my society <Icon name="arrowRight" className="size-[18px]" />
              </TrackedLink>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Greater+Noida+West"
                target="_blank"
                rel="noopener"
                className="btn-outline"
              >
                <Icon name="mapPin" className="size-5" /> View on Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" data-section="faq" className="scroll-mt-20 px-4 pb-12 md:pb-20">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="mb-6 mt-2 text-[32px] font-extrabold leading-tight text-forest-900 md:text-5xl">Questions, answered</h2>
          <Faq />
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section data-section="final_cta" className="px-4 pb-12 md:pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-forest-700 px-6 py-10 text-center text-white md:py-16">
          <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-leaf-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 size-64 rounded-full bg-sun-400/20 blur-2xl" />
          <h2 className="relative text-[30px] font-extrabold leading-tight md:text-5xl">
            Book Your Cleaning Plan <span className="text-sun-400">Today!</span>
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/80">Takes less than a minute. We confirm availability in your society on WhatsApp.</p>
          <div className="relative mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <TrackedLink href="/book" event="book_clicked" props={{ location: "final_cta" }} className="btn-sun sm:px-8">
              Book Now <Icon name="arrowRight" className="size-[18px]" />
            </TrackedLink>
            <TrackedLink href={telLink} event="call_clicked" props={{ location: "final_cta" }} className="btn border-2 border-white/25 text-white">
              <Icon name="phone" className="size-5" /> +91 {contact.phone}
            </TrackedLink>
          </div>
        </div>
      </section>
    </>
  );
}
