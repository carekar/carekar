"use client";

// Lightweight first-party funnel tracking (plan.md §10).
// Events are batched and sent with sendBeacon so they never slow the page.

type Props = Record<string, string | number | boolean | null>;

const VISITOR_KEY = "ck_vid";
const SESSION_KEY = "ck_sid";
const SESSION_TS_KEY = "ck_sts";
const TOUCH_KEY = "ck_touch";
const SESSION_TIMEOUT = 30 * 60 * 1000;

let queue: { name: string; props?: Props; path: string; at: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

const rid = (p: string) => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function getVisitorId() {
  const ls = store("local");
  let id = ls?.getItem(VISITOR_KEY);
  if (!id) {
    id = rid("v_");
    ls?.setItem(VISITOR_KEY, id);
  }
  return id;
}

/** Returns the session id and whether a new session just started. */
function getSession(): { id: string; isNew: boolean } {
  const ls = store("local");
  const now = Date.now();
  const last = Number(ls?.getItem(SESSION_TS_KEY) || 0);
  let id = ls?.getItem(SESSION_KEY);
  let isNew = false;
  if (!id || now - last > SESSION_TIMEOUT) {
    id = rid("s_");
    ls?.setItem(SESSION_KEY, id);
    isNew = true;
  }
  ls?.setItem(SESSION_TS_KEY, String(now));
  return { id, isNew };
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const inApp = /WhatsApp/i.test(ua) ? "WhatsApp" : /Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV/i.test(ua) ? "Facebook" : "";
  const os = /Android/i.test(ua) ? "Android" : /iPad/i.test(ua) ? "iPadOS" : /iPhone|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : "Other";
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const browser = inApp ? inApp + " in-app" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Other";
  return { device, os, browser, inApp, screenW: window.innerWidth };
}

function channelFrom(utm: Record<string, string>, referrer: string) {
  const s = (utm.source || "").toLowerCase();
  const m = (utm.medium || "").toLowerCase();
  if (s.includes("whatsapp")) return "WhatsApp group";
  if (s === "poster" || m === "qr") return "Poster QR";
  if (["meta", "facebook", "instagram", "fb", "ig"].includes(s)) return m === "paid" || m === "cpc" ? "Instagram / Facebook ads" : "Instagram / Facebook";
  if (s === "google") return m === "cpc" || m === "paid" ? "Google ads" : "Google search";
  if (m === "referral" || s === "friend") return "Referral";
  if (/google\./.test(referrer)) return "Google search";
  if (/instagram|facebook/.test(referrer)) return "Instagram / Facebook";
  if (/whatsapp/.test(referrer)) return "WhatsApp group";
  if (referrer && !referrer.includes(location.host)) return "Referral";
  return "Direct";
}

type Touch = { channel: string; source?: string; medium?: string; campaign?: string; content?: string; term?: string; landing: string; referrer: string; at: string };

export function currentTouch(): Touch {
  const p = new URLSearchParams(location.search);
  const utm: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign", "content", "term"]) {
    const v = p.get("utm_" + k);
    if (v) utm[k] = v;
  }
  const referrer = document.referrer || "";
  return { channel: channelFrom(utm, referrer), ...utm, landing: location.pathname, referrer, at: new Date().toISOString() };
}

export function getTouches() {
  try {
    return JSON.parse(store("local")?.getItem(TOUCH_KEY) || "null") as { first: ReturnType<typeof currentTouch>; last: ReturnType<typeof currentTouch> } | null;
  } catch {
    return null;
  }
}

function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const { id } = getSession();
  const body = JSON.stringify({ visitorId: getVisitorId(), sessionId: id, events: queue });
  queue = [];
  const blob = new Blob([body], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/events", blob)) {
    fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }
}

export function track(name: string, props?: Props) {
  if (typeof window === "undefined") return;
  if (document.cookie.includes("ck_staff=")) return; // exclude the team's own visits
  queue.push({ name, props, path: location.pathname, at: new Date().toISOString() });
  if (!timer) timer = setTimeout(flush, 1500);
}

/** Call once per page load. Starts a session (with attribution) when needed. */
export function startTracking() {
  const { isNew } = getSession();
  const touch = currentTouch();
  const hasUtm = "source" in touch;
  const touches = getTouches();
  const ls = store("local");
  if (!touches) ls?.setItem(TOUCH_KEY, JSON.stringify({ first: touch, last: touch }));
  else if (isNew || hasUtm) ls?.setItem(TOUCH_KEY, JSON.stringify({ first: touches.first, last: touch }));

  if (isNew || hasUtm) {
    const d = deviceInfo();
    track("session_start", {
      channel: touch.channel,
      source: touch.source ?? null,
      medium: touch.medium ?? null,
      campaign: touch.campaign ?? null,
      content: touch.content ?? null,
      landing: touch.landing,
      referrer: touch.referrer || null,
      returning: !!touches,
      device: d.device,
      os: d.os,
      browser: d.browser,
      inApp: d.inApp || null,
      screenW: d.screenW,
    });
  }
  track("page_view");

  if (!listening) {
    listening = true;
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  }
}

let listening = false;

export const getSessionId = () => getSession().id;

export { flush as flushTracking };
