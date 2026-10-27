import type { DB, Lead, LeadStatus, Payment, Session, TrackEvent } from "../../lib/types";
import { plans, type VehicleType } from "../../lib/site";

// Generates ~45 days of realistic demo traffic so the admin dashboard can be
// previewed. Every record is flagged `demo: true` and can be cleared in Settings.

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const firstNames = ["Rahul", "Priya", "Amit", "Neha", "Vikas", "Pooja", "Sandeep", "Anjali", "Rohit", "Kavita", "Manish", "Sneha", "Arjun", "Ritu", "Deepak", "Shalini", "Gaurav", "Megha", "Saurabh", "Nidhi", "Ankit", "Swati", "Varun", "Divya", "Harsh", "Komal", "Nitin", "Isha", "Pankaj", "Shruti"];
const lastNames = ["Sharma", "Verma", "Gupta", "Singh", "Agarwal", "Mishra", "Yadav", "Chauhan", "Tiwari", "Jain", "Saxena", "Bansal", "Kumar", "Malhotra", "Srivastava"];
const societies = ["Gaur City 1", "Gaur City 2", "Supertech Ecovillage 1", "Ace City", "Mahagun Mywoods", "Nirala Estate", "Panchsheel Greens", "Cherry County", "Galaxy North Avenue", "Ajnara Homes", "Eldeco Live by the Greens", "Gaur Saundaryam", "Arihant Arden", "Paramount Emotions"];
const models: Record<VehicleType, string[]> = {
  hatchback: ["Swift", "i20", "Baleno", "Tiago", "WagonR", "Altroz"],
  sedan: ["City", "Dzire", "Verna", "Ciaz", "Aura"],
  suv: ["Creta", "XUV700", "Nexon", "Brezza", "Ertiga", "Innova Crysta", "Seltos"],
  luxury: ["Mercedes C-Class", "BMW 3 Series", "Audi A4", "Volvo XC60"],
  bike: ["Activa", "Splendor", "Pulsar", "Jupiter", "Access"],
};
const lostReasons = ["Price too high", "No response", "Chose another service", "Society not covered", "Changed mind"];

type Channel = { key: string; weight: number; source?: string; medium?: string; campaign?: string[]; inApp?: string; boost: number };
const channels: Channel[] = [
  { key: "WhatsApp group", weight: 34, source: "whatsapp", medium: "social", campaign: ["gaur-city-launch", "ecovillage-group", "rwa-share"], inApp: "WhatsApp", boost: 1.35 },
  { key: "Poster QR", weight: 19, source: "poster", medium: "qr", campaign: ["gaur-city-2-lift", "ace-city-gate", "mywoods-lobby"], boost: 1.2 },
  { key: "Instagram / Facebook ads", weight: 20, source: "meta", medium: "paid", campaign: ["launch-oct", "suv-offer"], inApp: "Instagram", boost: 0.65 },
  { key: "Google search", weight: 12, source: "google", medium: "organic", boost: 1.1 },
  { key: "Direct", weight: 10, boost: 1.0 },
  { key: "Referral", weight: 5, source: "friend", medium: "referral", boost: 1.5 },
];

export function buildDemoData(): DB {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const weighted = <T extends { weight: number }>(a: T[]) => {
    let t = r() * a.reduce((s, x) => s + x.weight, 0);
    for (const x of a) if ((t -= x.weight) <= 0) return x;
    return a[0];
  };

  const db: DB = { leads: [], events: [], sessions: [], payments: [], seq: 1000 };
  const now = Date.now();
  const DAY = 86400000;
  const DAYS = 45;
  const visitors: string[] = [];

  for (let d = DAYS; d >= 0; d--) {
    const dayStart = now - d * DAY;
    const sessionsToday = Math.round(12 + (DAYS - d) * 0.9 + r() * 10);

    for (let s = 0; s < sessionsToday; s++) {
      const hour = weighted([
        { h: 7, weight: 6 }, { h: 9, weight: 8 }, { h: 12, weight: 7 }, { h: 14, weight: 5 },
        { h: 18, weight: 9 }, { h: 20, weight: 12 }, { h: 21, weight: 11 }, { h: 22, weight: 7 },
      ]).h;
      let t = dayStart - (now % DAY) + hour * 3600000 + Math.floor(r() * 3600000);
      if (t > now) t = now - Math.floor(r() * 3600000);
      const ch = weighted(channels);
      const returning = visitors.length > 20 && r() < 0.18;
      const visitorId = returning ? pick(visitors) : "v_demo_" + Math.floor(r() * 1e9).toString(36);
      if (!returning) visitors.push(visitorId);
      const deviceRoll = r();
      const device = deviceRoll < 0.87 ? "mobile" : deviceRoll < 0.96 ? "desktop" : "tablet";
      const os = device === "mobile" ? (r() < 0.78 ? "Android" : "iOS") : device === "tablet" ? "iPadOS" : "Windows";
      const inApp = device === "mobile" && ch.inApp && r() < 0.8 ? ch.inApp : undefined;
      const browser = inApp ? inApp + " in-app" : os === "iOS" ? "Safari" : "Chrome";
      const sessionId = "s_demo_" + Math.floor(r() * 1e12).toString(36);

      const session: Session = {
        id: sessionId, visitorId, startedAt: new Date(t).toISOString(), channel: ch.key,
        source: ch.source, medium: ch.medium, campaign: ch.campaign ? pick(ch.campaign) : undefined,
        landing: "/", device, os, browser, inApp, returning, demo: true,
      };
      db.sessions.push(session);

      const ev = (name: string, props?: TrackEvent["props"], path = "/") => {
        t += 4000 + Math.floor(r() * 40000);
        db.events.push({ at: new Date(Math.min(t, now)).toISOString(), visitorId, sessionId, name, props, path, demo: true });
      };
      const b = ch.boost * (device === "desktop" ? 0.85 : 1) * (inApp === "Instagram" ? 0.8 : 1);
      const pass = (p: number) => r() < Math.min(0.97, p * b);

      ev("session_start", { channel: ch.key, device });
      ev("page_view");
      if (r() < 0.07) ev("whatsapp_clicked", { location: pick(["sticky_bar", "hero", "final_cta"]) });
      if (!pass(0.6)) continue;
      ev("engaged", { trigger: pick(["scroll", "click", "time"]) });
      ev("scroll_depth", { depth: 50 });
      const plan = weighted([
        { p: plans[0], weight: 30 }, { p: plans[1], weight: 22 }, { p: plans[2], weight: 30 },
        { p: plans[3], weight: 6 }, { p: plans[4], weight: 12 },
      ]).p;
      if (!pass(0.55)) continue;
      ev("vehicle_selected", { vehicle: plan.vehicle, location: "picker" });
      if (!pass(0.93)) continue;
      ev("plan_viewed", { vehicle: plan.vehicle, price: plan.price });
      if (!pass(0.45)) {
        if (r() < 0.25) ev("faq_opened", { question: Math.floor(r() * 6) });
        continue;
      }
      const loc = pick(["plan_card", "plan_card", "sticky_bar", "hero", "final_cta"]);
      ev("book_clicked", { location: loc, vehicle: plan.vehicle });
      ev("form_opened", { prefilled: loc === "plan_card" }, "/book");
      if (!pass(0.82)) { ev("form_abandoned", { last_step: 1, last_field: "vehicle" }, "/book"); continue; }
      ev("form_started", { first_field: "vehicle" }, "/book");
      ev("form_step_completed", { step: 1, duration_ms: 8000 + Math.floor(r() * 20000) }, "/book");
      if (r() < 0.22) ev("form_field_error", { field: "mobile", error: "invalid_format" }, "/book");
      if (!pass(0.76)) { ev("form_abandoned", { last_step: 2, last_field: pick(["mobile", "mobile", "name"]) }, "/book"); continue; }
      ev("form_step_completed", { step: 2, duration_ms: 15000 + Math.floor(r() * 30000) }, "/book");
      if (r() < 0.1) ev("society_not_listed", {}, "/book");
      if (!pass(0.8)) { ev("form_abandoned", { last_step: 3, last_field: pick(["society", "locality", "tower_flat"]) }, "/book"); continue; }
      ev("form_step_completed", { step: 3, duration_ms: 20000 + Math.floor(r() * 30000) }, "/book");
      if (r() < 0.08) ev("form_field_error", { field: "startDate", error: "required" }, "/book");
      if (!pass(0.86)) { ev("form_abandoned", { last_step: 4, last_field: pick(["startDate", "consent", "notes"]) }, "/book"); continue; }
      ev("form_step_completed", { step: 4, duration_ms: 15000 + Math.floor(r() * 25000) }, "/book");
      if (!pass(0.95)) { ev("form_abandoned", { last_step: 5, last_field: "review" }, "/book"); continue; }

      // Lead submitted
      const id = "lead_demo_" + db.seq;
      const ref = "DEMO-" + db.seq++;
      ev("lead_submitted", { vehicle: plan.vehicle, price: plan.price }, "/book");
      db.events[db.events.length - 1].leadId = id;
      const createdAt = new Date(Math.min(t, now));
      const ageDays = (now - createdAt.getTime()) / DAY;
      const name = pick(firstNames) + " " + pick(lastNames);
      const society = pick(societies);
      const history: Lead["history"] = [{ at: createdAt.toISOString(), to: "new" }];
      let status: LeadStatus = "new";
      let lostReason: string | undefined;
      let at = createdAt.getTime();
      const move = (to: LeadStatus, minH: number, maxH: number) => {
        at += (minH + r() * (maxH - minH)) * 3600000;
        if (at > now) return false;
        history.push({ at: new Date(at).toISOString(), from: status, to });
        status = to;
        return true;
      };
      const fresh = ageDays < 0.3;
      if (!fresh && r() < 0.9 && move("contacted", 0.2, 6)) {
        const notCovered = society === "Paramount Emotions" || society === "Arihant Arden";
        if (notCovered && r() < 0.8) {
          move("not_serviceable", 2, 24);
        } else if (r() < 0.85 && move("availability_confirmed", 2, 30)) {
          if (r() < 0.93 && move("payment_link_sent", 0.5, 12)) {
            if (r() < 0.72) {
              if (move("active", 1, 48)) {
                const payAt = at;
                db.payments.push({ id: "pay_demo_" + db.seq, leadId: id, amount: plan.price, method: pick(["upi", "upi", "upi_autopay", "card", "netbanking"]), status: "captured", at: new Date(payAt).toISOString(), demo: true });
                if (now - payAt > 30 * DAY) {
                  if (r() < 0.85) db.payments.push({ id: "pay_demo_r" + db.seq, leadId: id, amount: plan.price, method: "upi_autopay", status: "captured", at: new Date(payAt + 30 * DAY).toISOString(), demo: true });
                  else move("cancelled", 30 * 24, 31 * 24);
                }
                if (r() < 0.06) db.payments.push({ id: "pay_demo_f" + db.seq, leadId: id, amount: plan.price, method: "card", status: "failed", at: new Date(payAt - 600000).toISOString(), demo: true });
              }
            } else if (ageDays > 3) {
              lostReason = pick(lostReasons);
              move("lost", 48, 96);
            }
          }
        } else if (ageDays > 3 && (status as LeadStatus) === "contacted") {
          lostReason = pick(lostReasons);
          move("lost", 24, 72);
        }
      }

      db.leads.push({
        id, ref, createdAt: createdAt.toISOString(),
        vehicle: plan.vehicle, vehicleModel: r() < 0.7 ? pick(models[plan.vehicle]) : "", vehicleCount: r() < 0.1 ? 2 : 1,
        name, mobile: String(9 - Math.floor(r() * 3)) + String(Math.floor(r() * 1e9)).padStart(9, "0"),
        sameWhatsapp: true, whatsapp: "",
        society, towerFlat: r() < 0.7 ? `Tower ${String.fromCharCode(65 + Math.floor(r() * 8))}, ${Math.floor(r() * 20) + 1}0${Math.floor(r() * 9) + 1}` : "",
        locality: "Greater Noida West", parkingType: pick(["Basement", "Stilt", "Open", ""]), parkingSlot: "",
        startDate: new Date(createdAt.getTime() + 2 * DAY).toISOString().slice(0, 10),
        preferredTime: pick(["Early morning (5–7 AM)", "Morning (7–9 AM)", "No preference"]),
        vehicleColour: "", registrationNo: "", heardFrom: "", notes: "",
        callbackRequested: r() < 0.25,
        planPrice: plan.price, status, lostReason, history, teamNotes: [],
        visitorId,
        firstTouch: { channel: ch.key, source: ch.source, medium: ch.medium, campaign: session.campaign, landing: "/", at: session.startedAt },
        lastTouch: { channel: ch.key, source: ch.source, medium: ch.medium, campaign: session.campaign, landing: "/", at: session.startedAt },
        device, inApp, demo: true,
      });
    }
  }
  db.events.sort((a, b) => a.at.localeCompare(b.at));
  return db;
}
