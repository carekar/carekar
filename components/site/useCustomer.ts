"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/track";
import type { Customer } from "@/lib/firebase";

export type { Customer };

const loadFirebase = () => import("@/lib/firebase");

/** Messages for the Firebase errors a customer can actually hit. */
function signInError(code?: string) {
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/network-request-failed") return "No internet connection. Please try again.";
  if (code === "auth/unauthorized-domain") return "Login isn't set up for this website address yet. Please WhatsApp or call us.";
  return "Couldn't log in with Google. Please try again.";
}

/** Google sign-in state. Firebase is only downloaded once `enabled` is true. */
export function useCustomer(enabled = true, location = "unknown") {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    loadFirebase().then(({ watchCustomer }) => {
      if (cancelled) return;
      unsub = watchCustomer((c) => {
        setCustomer(c);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [enabled]);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError("");
    track("login_started", { location, method: "google" });
    try {
      const c = await (await loadFirebase()).signInWithGoogle();
      if (c) {
        setCustomer(c);
        track("login_completed", { location, method: "google" });
      }
      return c;
    } catch (e) {
      const code = (e as { code?: string }).code;
      track("login_failed", { location, code: code ?? "unknown" });
      setError(signInError(code));
      return null;
    } finally {
      setBusy(false);
    }
  }, [location]);

  const signOut = useCallback(async () => {
    await (await loadFirebase()).signOutCustomer();
    setCustomer(null);
    track("logout", { location });
  }, [location]);

  const token = useCallback(async () => (await loadFirebase()).customerToken(), []);

  return { customer, loading, busy, error, signIn, signOut, token };
}

/** WhatsApp / Instagram / Facebook built-in browsers, where Google blocks sign-in. */
export function inAppBrowser() {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  return /WhatsApp/i.test(ua) ? "WhatsApp" : /Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV/i.test(ua) ? "Facebook" : "";
}

/** Android link that reopens the current address in Chrome (no-op elsewhere). */
export function openInChromeHref(url: string) {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
}
