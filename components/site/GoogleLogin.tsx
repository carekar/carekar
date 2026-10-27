"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/track";
import { inAppBrowser, openInChromeHref } from "./useCustomer";

/** Google's "G" mark (official colours), as required next to "Continue with Google". */
export function GoogleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function GoogleButton({ onClick, busy, label = "Continue with Google" }: { onClick: () => void; busy?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-ink-400/40 bg-white px-5 text-base font-semibold text-ink-900 shadow-sm transition active:scale-[0.99] disabled:opacity-70"
    >
      <GoogleMark />
      {busy ? "Opening Google…" : label}
    </button>
  );
}

/**
 * Google blocks sign-in inside WhatsApp / Instagram / Facebook's built-in browsers.
 * Explains that and offers to reopen the page in Chrome (Android) or copy the link.
 */
export function InAppBrowserNote({ location }: { location: string }) {
  const [app, setApp] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const a = inAppBrowser();
    setApp(a);
    if (a) track("login_in_app_browser", { location, app: a });
  }, [location]);
  if (!app) return null;

  const android = /Android/i.test(navigator.userAgent);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location === "booking" ? window.location.origin + "/book" : window.location.href);
      setCopied(true);
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-sun-400/60 bg-sun-400/10 p-4 text-sm text-ink-900" role="note">
      <p className="flex items-start gap-2 font-semibold">
        <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
        Google login doesn&apos;t work inside {app}.
      </p>
      <p className="mt-1 text-ink-600">
        {android ? "Open this page in Chrome to log in." : `Tap ••• and choose "Open in Safari", or copy the link into your browser.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {android && (
          <a href={openInChromeHref(window.location.href)} className="btn-primary !min-h-11 !px-4 text-sm">
            Open in Chrome
          </a>
        )}
        <button type="button" onClick={copy} className="min-h-11 rounded-full border border-forest-700/20 bg-white px-4 font-semibold text-forest-700">
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
