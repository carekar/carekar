"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatINR, isCar, type Service, type VehicleType } from "@/lib/site";
import { findPlan } from "@/lib/config";
import { useConfig } from "./ConfigProvider";
import { leadSchema, oneTimeVehicleError, stepFields, type LeadInput } from "@/lib/validation";
import { flushTracking, getSessionId, getTouches, getVisitorId, track } from "@/lib/track";
import { payForBooking } from "@/lib/checkout";
import { useCustomer } from "./useCustomer";
import { GoogleButton, InAppBrowserNote } from "./GoogleLogin";

type Data = {
  service: Service;
  vehicle: VehicleType | "";
  vehicleModel: string;
  vehicleCount: number;
  name: string;
  mobile: string;
  sameWhatsapp: boolean;
  whatsapp: string;
  society: string;
  towerFlat: string;
  locality: string;
  parkingType: string;
  parkingSlot: string;
  startDate: string;
  preferredTime: string;
  vehicleColour: string;
  registrationNo: string;
  heardFrom: string;
  notes: string;
  consent: boolean;
};

const empty: Data = {
  service: "subscription",
  vehicle: "", vehicleModel: "", vehicleCount: 1,
  name: "", mobile: "", sameWhatsapp: true, whatsapp: "",
  society: "", towerFlat: "", locality: "Greater Noida West", parkingType: "", parkingSlot: "",
  startDate: "", preferredTime: "", vehicleColour: "", registrationNo: "", heardFrom: "", notes: "",
  consent: true,
};

const DRAFT_KEY = "ck_booking_draft";
const STEPS = ["Vehicle", "Your details", "Location", "Schedule"];
const parkingTypes = ["Basement", "Stilt", "Open", "Street"];
const times = ["Early morning (5–7 AM)", "Morning (7–9 AM)", "No preference"];
const sources = ["Society WhatsApp group", "Friend / neighbour", "Poster", "Instagram / Facebook", "Google", "Other"];

const tomorrow = () => {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().slice(0, 10);
};

type Errors = Partial<Record<keyof Data, string>>;

export function BookingForm({ initialVehicle, initialService }: { initialVehicle?: VehicleType; initialService?: Service }) {
  const router = useRouter();
  const config = useConfig();
  const { plans, oneTime, societies: knownSocieties } = config;
  const planByVehicle = (v: string | null | undefined) => findPlan(config, v);
  const [data, setData] = useState<Data>({ ...empty, service: initialService ?? "subscription", vehicle: initialVehicle ?? "" });
  const [step, setStep] = useState(1); // 1–4, 5 = review
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState<false | "book" | "verifying" | "callback">(false);
  const [serverError, setServerError] = useState("");
  // the saved booking while its payment is pending (cancelled / failed); cleared if details change
  const [bookedRef, setBookedRef] = useState("");
  const [honeypot, setHoneypot] = useState("");
  // Google login is required to confirm a booking (not for a callback request)
  const account = useCustomer(step === 5, "booking");

  const started = useRef(false);
  const submitted = useRef(false);
  const stepStart = useRef(Date.now());
  const lastField = useRef<string>("vehicle");
  const live = useRef({ step, data });
  live.current = { step, data };
  const topRef = useRef<HTMLDivElement>(null);

  // Restore draft, record form_opened, and record abandonment on leave
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { data: Data; step: number };
        started.current = true;
        setData({ ...empty, ...draft.data, service: initialService ?? draft.data.service ?? "subscription", vehicle: initialVehicle ?? draft.data.vehicle });
        setStep(Math.min(draft.step, 5));
        track("form_resumed", { step: draft.step });
      }
    } catch {}
    track("form_opened", { prefilled: !!initialVehicle, vehicle: initialVehicle ?? null });
    if (initialVehicle) {
      const p = planByVehicle(initialVehicle)!;
      track("plan_viewed", { vehicle: p.vehicle, price: p.price, location: "form" });
    }

    const onHide = () => {
      if (submitted.current || !started.current) return;
      track("form_abandoned", { last_step: live.current.step, last_field: lastField.current });
      flushTracking();
    };
    window.addEventListener("pagehide", onHide);
    const onVis = () => document.visibilityState === "hidden" && onHide();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft
  useEffect(() => {
    if (!started.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step }));
    } catch {}
  }, [data, step]);

  useEffect(() => {
    stepStart.current = Date.now();
    track("form_step_viewed", { step });
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const needsLogin = step === 5 && !account.loading && !account.customer;
  useEffect(() => {
    if (needsLogin) track("login_prompt_viewed", { location: "booking" });
  }, [needsLogin]);

  const set = <K extends keyof Data>(key: K, value: Data[K]) => {
    if (!started.current) {
      started.current = true;
      track("form_started", { first_field: key });
    }
    lastField.current = key;
    setBookedRef(""); // re-submit so the saved booking gets the new details
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (fields: (keyof LeadInput)[]) => {
    const mask = Object.fromEntries(fields.map((f) => [f, true])) as Record<keyof LeadInput, true>;
    const result = leadSchema.pick(mask).safeParse(clean(data));
    const errs: Errors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof Data;
        if (!errs[k]) errs[k] = issue.message;
      }
    }
    if (fields.includes("vehicle") && !errs.vehicle) {
      const e = oneTimeVehicleError(data);
      if (e) errs.vehicle = e;
    }
    if (fields.includes("startDate") && data.startDate && data.startDate < tomorrow()) errs.startDate = "Start date must be from tomorrow";
    for (const k of Object.keys(errs)) track("form_field_error", { field: k, step });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validate(stepFields[step])) return;
    track("form_step_completed", { step, duration_ms: Date.now() - stepStart.current });
    if (step === 3 && data.society && !knownSocieties.some((s) => s.toLowerCase() === data.society.trim().toLowerCase())) {
      track("society_not_listed", { society: data.society.trim().slice(0, 60) });
    }
    setStep((s) => s + 1);
  };

  const back = () => {
    track("form_back", { from_step: step });
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async (mode: "book" | "callback") => {
    if (!validate([1, 2, 3, 4].flatMap((s) => stepFields[s]))) {
      setStep(1);
      return;
    }
    setSubmitting(mode);
    setServerError("");
    if (mode === "callback") track("callback_requested");
    const touches = getTouches();
    try {
      const idToken = await account.token().catch(() => undefined);
      if (mode === "book" && !idToken) throw new Error("Please log in with Google to confirm your booking.");
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json", ...(idToken ? { authorization: "Bearer " + idToken } : {}) },
        body: JSON.stringify({
          ...clean(data),
          callbackRequested: mode === "callback",
          company: honeypot,
          meta: {
            visitorId: getVisitorId(),
            sessionId: getSessionId(),
            first: touches?.first,
            last: touches?.last,
            device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
            inApp: /WhatsApp/i.test(navigator.userAgent) ? "WhatsApp" : /Instagram/i.test(navigator.userAgent) ? "Instagram" : undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      submitted.current = true;
      flushTracking();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      if (mode === "callback") return void router.push(thankYou(json.ref, "callback"));
      setBookedRef(json.ref);
      await pay(json.ref);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const thankYou = (ref: string, kind: "callback" | "paid") =>
    "/book/thank-you?" +
    new URLSearchParams({ ref, n: data.name.split(" ")[0], v: data.vehicle, s: data.society, c: kind === "callback" ? "1" : "0", t: data.service, ...(kind === "paid" ? { paid: "1" } : {}) });

  /** Payment confirms the booking. If it's cancelled or fails, the booking stays saved to retry here or on My bookings. */
  const pay = async (ref: string) => {
    setSubmitting("book");
    setServerError("");
    const result = await payForBooking(ref, account.token, { location: "booking", onVerifying: () => setSubmitting("verifying") });
    if (result.paid) return void router.push(thankYou(ref, "paid"));
    setServerError(result.error);
    setSubmitting(false);
  };

  const plan = planByVehicle(data.vehicle);
  const single = data.service === "one_time";
  const price = single ? oneTime.price : plan?.price ?? 0;
  const priceUnit = single ? " one-time" : "/month";
  const planName = single ? oneTime.label : plan ? plan.label + " plan" : "";
  const vehicles = single ? plans.filter((p) => isCar(p.vehicle)) : plans;
  const chooseService = (svc: Service) => {
    if (svc === data.service) return;
    set("service", svc);
    if (svc === "one_time" && data.vehicle === "bike") set("vehicle", "");
    track("service_selected", { service: svc, location: "form" });
  };
  const progress = step === 5 ? 100 : ((step - 1) / 4) * 100 + 8;

  return (
    <div ref={topRef} className="scroll-mt-16">
      {/* Progress */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-cream-200 bg-cream-50/95 px-4 pb-3 pt-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <button onClick={back} className="-ml-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-forest-700">
              <Icon name="arrowLeft" className="size-[18px]" /> Back
            </button>
          ) : (
            <span className="text-sm font-semibold text-forest-700">{single ? "Book one-time cleaning" : "Book your plan"}</span>
          )}
          <span className="text-sm font-medium text-ink-600">{step === 5 ? "Review & confirm" : `Step ${step} of 4 · ${STEPS[step - 1]}`}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-leaf-400 transition-all duration-500" style={{ width: progress + "%" }} />
        </div>
      </div>

      {plan && step > 1 && step < 5 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-leaf-100 px-4 py-3 text-sm">
          <span className="font-semibold text-forest-900">{planName}</span>
          <span className="font-display tabular text-lg font-extrabold text-forest-900">
            {formatINR(price)}<span className="font-sans text-xs font-medium text-ink-600">{priceUnit}</span>
          </span>
        </div>
      )}

      <div key={step} className="animate-rise pb-32 pt-5">
        {step === 1 && (
          <section>
            {!oneTime.hidden && (
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-cream-100 p-1.5" role="radiogroup" aria-label="Type of service">
                {([
                  ["subscription", "Monthly plan", "Scheduled cleaning"],
                  ["one_time", "One-time clean", `${formatINR(oneTime.price)} · inside & out`],
                ] as const).map(([svc, title, sub]) => (
                  <button
                    key={svc}
                    type="button"
                    role="radio"
                    aria-checked={data.service === svc}
                    onClick={() => chooseService(svc)}
                    className={"min-h-14 rounded-xl px-3 py-2 text-left transition " + (data.service === svc ? "bg-white shadow-[var(--shadow-card)]" : "")}
                  >
                    <span className="block font-bold leading-tight text-forest-900">{title}</span>
                    <span className="block text-xs text-ink-600">{sub}</span>
                  </button>
                ))}
              </div>
            )}
            <h1 className="text-[28px] font-extrabold leading-tight text-forest-900">{single ? "Which car do you want cleaned?" : "Which vehicle do you want cleaned?"}</h1>
            <p className="mt-1 text-ink-600">{single ? `Interior + exterior in one visit. ${formatINR(oneTime.price)} for any car.` : "Your monthly price is shown on each option."}</p>
            <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Vehicle type">
              {vehicles.map((p) => {
                const active = data.vehicle === p.vehicle;
                return (
                  <button
                    key={p.vehicle}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      set("vehicle", p.vehicle);
                      track("vehicle_selected", { vehicle: p.vehicle, location: "form" });
                      track("plan_viewed", { vehicle: p.vehicle, price: single ? oneTime.price : p.price, service: data.service, location: "form" });
                    }}
                    className={
                      "relative overflow-hidden rounded-2xl border-2 bg-white text-left transition " + (vehicles.length % 2 ? "last:col-span-2 " : "") +
                      (active ? "border-forest-700 shadow-[var(--shadow-card)]" : "border-cream-200")
                    }
                  >
                    <div className="relative aspect-[16/9] bg-cream-100">
                      <Image src={p.image} alt="" fill sizes="(min-width:640px) 300px, 50vw" className="object-cover" />
                    </div>
                    <div className="flex items-end justify-between gap-2 p-3">
                      <div>
                        <p className="font-bold leading-tight text-forest-900">{p.label}</p>
                        <p className="tabular mt-0.5 text-sm font-semibold text-forest-700">{formatINR(single ? oneTime.price : p.price)}<span className="font-normal text-ink-600">{single ? " once" : "/mo"}</span></p>
                      </div>
                      <span className={"grid size-6 shrink-0 place-items-center rounded-full border-2 " + (active ? "border-forest-700 bg-forest-700 text-white" : "border-cream-200")}>
                        {active && <Icon name="check" className="size-3.5" strokeWidth={3} />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError msg={errors.vehicle} />

            {(plan || single) && (
              <div className="mt-5 rounded-2xl border border-leaf-200 bg-white p-4">
                <p className="text-sm font-bold text-forest-900">Included in {single ? "one-time cleaning" : plan!.label + " plan"}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
                  {(single ? oneTime.inclusions : plan!.inclusions).map((i) => (
                    <li key={i} className="flex gap-2">
                      <Icon name="check" className="mt-0.5 size-4 shrink-0 text-leaf-400" strokeWidth={2.5} /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 space-y-5">
              <Field label="Vehicle model" optional>
                <input className="field" placeholder="e.g. Hyundai i20" value={data.vehicleModel} onChange={(e) => set("vehicleModel", e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Number of vehicles" optional hint="Same type, same flat">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Fewer vehicles" className="grid size-12 place-items-center rounded-xl border border-cream-200 bg-white text-forest-700 disabled:opacity-40" disabled={data.vehicleCount <= 1} onClick={() => set("vehicleCount", data.vehicleCount - 1)}>
                    <Icon name="minus" />
                  </button>
                  <span className="tabular w-8 text-center text-xl font-bold">{data.vehicleCount}</span>
                  <button type="button" aria-label="More vehicles" className="grid size-12 place-items-center rounded-xl border border-cream-200 bg-white text-forest-700 disabled:opacity-40" disabled={data.vehicleCount >= 5} onClick={() => set("vehicleCount", data.vehicleCount + 1)}>
                    <Icon name="plus" />
                  </button>
                </div>
              </Field>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-[28px] font-extrabold leading-tight text-forest-900">How can we reach you?</h1>
            <p className="mt-1 text-ink-600">We&apos;ll confirm your booking on WhatsApp or phone.</p>
            <div className="mt-6 space-y-5">
              <Field label="Your name" error={errors.name}>
                <input className="field" value={data.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" autoCapitalize="words" placeholder="Full name" enterKeyHint="next" />
              </Field>
              <Field label="Mobile number" error={errors.mobile}>
                <div className="flex">
                  <span className="grid min-h-12 place-items-center rounded-l-xl border border-r-0 border-cream-200 bg-cream-100 px-3.5 font-semibold text-ink-600">+91</span>
                  <input
                    className="field !rounded-l-none"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={data.mobile}
                    onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").replace(/^91(?=\d{10})/, "").slice(0, 10))}
                  />
                </div>
              </Field>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3">
                <input type="checkbox" className="size-5 accent-[var(--color-forest-700)]" checked={data.sameWhatsapp} onChange={(e) => set("sameWhatsapp", e.target.checked)} />
                <span className="text-[15px] font-medium">This number is on WhatsApp</span>
                <Icon name="whatsapp" className="ml-auto size-5 text-[#1faa53]" />
              </label>
              {!data.sameWhatsapp && (
                <Field label="WhatsApp number" error={errors.whatsapp}>
                  <input className="field" type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit WhatsApp number" value={data.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                </Field>
              )}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-[28px] font-extrabold leading-tight text-forest-900">Where is your vehicle parked?</h1>
            <p className="mt-1 text-ink-600">We&apos;ll check availability in your society.</p>
            <div className="mt-6 space-y-5">
              <Field label="Society / apartment name" error={errors.society}>
                <input className="field" list="societies" value={data.society} onChange={(e) => set("society", e.target.value)} placeholder="Start typing your society" autoComplete="off" />
                <datalist id="societies">
                  {knownSocieties.map((s) => <option key={s} value={s} />)}
                </datalist>
              </Field>
              <Field label="Tower / block & flat number" optional>
                <input className="field" value={data.towerFlat} onChange={(e) => set("towerFlat", e.target.value)} placeholder="e.g. Tower B, 1204" />
              </Field>
              <Field label="Locality / area" error={errors.locality}>
                <input className="field" value={data.locality} onChange={(e) => set("locality", e.target.value)} autoComplete="address-level2" />
              </Field>
              <Field label="Parking type" optional>
                <Chips options={parkingTypes} value={data.parkingType} onChange={(v) => set("parkingType", v)} />
              </Field>
              <Field label="Parking slot number" optional>
                <input className="field" value={data.parkingSlot} onChange={(e) => set("parkingSlot", e.target.value)} placeholder="e.g. B2-114" />
              </Field>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="text-[28px] font-extrabold leading-tight text-forest-900">{single ? "When should we come?" : "When should we start?"}</h1>
            <p className="mt-1 text-ink-600">{single ? "Pick a date for the cleaning." : "Pick a start date."} A few optional details help our team.</p>
            <div className="mt-6 space-y-5">
              <Field label={single ? "Preferred date" : "Preferred start date"} error={errors.startDate}>
                <input className="field" type="date" min={tomorrow()} value={data.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Preferred cleaning time" optional>
                <Chips options={times} value={data.preferredTime} onChange={(v) => set("preferredTime", v)} />
              </Field>
              <div className="grid grid-cols-2 items-end gap-3">
                <Field label="Vehicle colour" optional>
                  <input className="field" value={data.vehicleColour} onChange={(e) => set("vehicleColour", e.target.value)} placeholder="e.g. White" />
                </Field>
                <Field label="Registration no." optional>
                  <input className="field uppercase" value={data.registrationNo} onChange={(e) => set("registrationNo", e.target.value.toUpperCase())} placeholder="UP16 AB 1234" autoCapitalize="characters" />
                </Field>
              </div>
              <Field label="How did you hear about us?" optional>
                <Chips options={sources} value={data.heardFrom} onChange={(v) => set("heardFrom", v)} />
              </Field>
              <Field label="Anything else we should know?" optional>
                <textarea className="field min-h-24" maxLength={300} value={data.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Car cover, key handover for interior cleaning…" />
              </Field>
              <label className="flex cursor-pointer gap-3 rounded-xl bg-white p-4">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-forest-700)]" checked={data.consent} onChange={(e) => set("consent", e.target.checked)} />
                <span className="text-sm leading-relaxed text-ink-600">
                  I agree to be contacted on WhatsApp/phone about my booking, and accept the{" "}
                  <a href="/privacy-policy" target="_blank" className="font-semibold text-forest-700 underline">Privacy Policy</a> and{" "}
                  <a href="/terms" target="_blank" className="font-semibold text-forest-700 underline">Terms</a>.
                </span>
              </label>
              <FieldError msg={errors.consent} />
            </div>
          </section>
        )}

        {step === 5 && plan && (
          <section>
            <h1 className="text-[28px] font-extrabold leading-tight text-forest-900">Review your booking</h1>
            <p className="mt-1 text-ink-600">Pay securely to confirm your booking.</p>

            <div className="mt-5 overflow-hidden rounded-2xl bg-forest-900 text-white">
              <div className="flex items-center gap-4 p-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                  <Image src={single ? oneTime.image : plan.image} alt="" fill sizes="96px" className="object-cover" />
                </div>
                <div>
                  <p className="text-sm text-white/70">{planName}{data.vehicleCount > 1 ? ` × ${data.vehicleCount}` : ""}</p>
                  <p className="font-display tabular text-3xl font-extrabold">
                    {formatINR(price * data.vehicleCount)}<span className="font-sans text-sm font-medium text-white/70">{priceUnit}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 divide-y divide-cream-200 rounded-2xl bg-white">
              <Summary title="Vehicle" onEdit={() => setStep(1)} rows={[plan.label, data.vehicleModel, data.vehicleCount > 1 ? `${data.vehicleCount} vehicles` : ""]} />
              <Summary title="Contact" onEdit={() => setStep(2)} rows={[data.name, "+91 " + data.mobile, !data.sameWhatsapp && data.whatsapp ? "WhatsApp: +91 " + data.whatsapp : ""]} />
              <Summary title="Location" onEdit={() => setStep(3)} rows={[data.society, data.towerFlat, data.locality, [data.parkingType, data.parkingSlot].filter(Boolean).join(" · ")]} />
              <Summary title="Schedule" onEdit={() => setStep(4)} rows={[(single ? "Date: " : "Start: ") + formatDate(data.startDate), data.preferredTime, data.notes]} />
            </div>

            <input type="text" name="company" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="absolute -left-[9999px] size-px opacity-0" aria-hidden="true" />

            {serverError && (
              <p className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger" role="alert">
                <Icon name="alert" className="size-5 shrink-0" /> {serverError}
              </p>
            )}

            <div className="mt-4 rounded-2xl bg-white p-4">
              {account.loading ? (
                <div className="h-10 animate-pulse rounded-xl bg-cream-100" aria-busy="true" />
              ) : account.customer ? (
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf-100 text-forest-700">
                    <Icon name="checkCircle" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-ink-900">Booking as {account.customer.name || account.customer.email}</p>
                    {account.customer.name && <p className="truncate text-ink-600">{account.customer.email}</p>}
                  </div>
                  <button type="button" onClick={account.signOut} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-forest-700">
                    Switch
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 font-bold text-forest-900">
                    <Icon name="user" className="size-5" /> Log in to confirm your booking
                  </p>
                  <p className="text-sm text-ink-600">
                    One tap with your Google account, so you can pay securely and track your booking. No password needed.
                  </p>
                  <InAppBrowserNote location="booking" />
                  {account.error && (
                    <p className="flex gap-2 text-sm font-medium text-danger" role="alert">
                      <Icon name="alert" className="size-5 shrink-0" /> {account.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            <ol className="mt-6 space-y-3 rounded-2xl border border-leaf-200 p-4 text-sm text-ink-600">
              <p className="font-bold text-forest-900">What happens next</p>
              {["Pay securely with Razorpay (UPI, card, netbanking)", "We confirm your slot on WhatsApp", single ? "We clean your car on your chosen date" : "Your scheduled cleaning starts"].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf-100 text-xs font-bold text-forest-700">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {/* Bottom action — thumb zone */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 px-4 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-xl">
          {step < 5 ? (
            <button onClick={next} className="btn-primary w-full">
              {step === 4 ? "Review booking" : "Continue"} <Icon name="arrowRight" className="size-[18px]" />
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {account.customer || account.loading ? (
                <>
                <button onClick={() => (bookedRef ? pay(bookedRef) : submit("book"))} disabled={!!submitting || account.loading} className="btn-primary w-full disabled:opacity-70">
                  {submitting === "verifying" ? "Confirming payment…" : submitting === "book" ? "Opening secure payment…" : <>Pay {formatINR(price * data.vehicleCount)} &amp; book <Icon name="arrowRight" className="size-[18px]" /></>}
                </button>
                <p className="-mt-1 text-center text-xs text-ink-400">Payments secured by Razorpay</p>
                </>
              ) : (
                // after a successful Google login the booking is confirmed straight away
                <GoogleButton
                  label="Continue with Google to pay & book"
                  busy={account.busy || submitting === "book" || submitting === "verifying"}
                  onClick={async () => {
                    if (await account.signIn()) await submit("book");
                  }}
                />
              )}
              <button onClick={() => submit("callback")} disabled={!!submitting} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-forest-700 disabled:opacity-70">
                <Icon name="phone" className="size-4" /> {submitting === "callback" ? "Sending…" : "Get a Callback instead"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clean(d: Data) {
  return { ...d, vehicle: d.vehicle || undefined, whatsapp: d.sameWhatsapp ? "" : d.whatsapp, consent: d.consent || undefined };
}

function formatDate(s: string) {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function Field({ label, optional, hint, error, children }: { label: string; optional?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">
        {label} {optional && <span className="font-normal text-ink-400">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger" role="alert">
      <Icon name="alert" className="size-4 shrink-0" /> {msg}
    </p>
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" data-active={value === o} aria-pressed={value === o} onClick={() => onChange(value === o ? "" : o)} className="chip">
          {o}
        </button>
      ))}
    </div>
  );
}

function Summary({ title, rows, onEdit }: { title: string; rows: string[]; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{title}</p>
        {rows.filter(Boolean).map((r) => (
          <p key={r} className="mt-0.5 break-words text-[15px] text-ink-900">{r}</p>
        ))}
      </div>
      <button onClick={onEdit} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-forest-700">
        Edit
      </button>
    </div>
  );
}
