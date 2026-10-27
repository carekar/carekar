"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/track";
import { GoogleButton, InAppBrowserNote } from "./GoogleLogin";
import { useCustomer } from "./useCustomer";

export function LoginPanel({ next }: { next: string }) {
  const router = useRouter();
  const { customer, loading, busy, error, signIn, signOut } = useCustomer(true, "login_page");

  useEffect(() => {
    track("login_page_viewed", { next });
  }, [next]);

  const onSignIn = async () => {
    if (await signIn()) router.push(next);
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <span className="grid size-12 place-items-center rounded-2xl bg-leaf-100 text-forest-700">
        <Icon name="user" className="size-6" />
      </span>

      {loading ? (
        <div className="mt-6 space-y-3" aria-busy="true">
          <div className="h-7 w-40 animate-pulse rounded bg-cream-100" />
          <div className="h-12 animate-pulse rounded-full bg-cream-100" />
        </div>
      ) : customer ? (
        <>
          <h1 className="mt-5 text-2xl font-extrabold text-forest-900">You&apos;re logged in</h1>
          <p className="mt-1 text-ink-600">
            {customer.name && <span className="font-semibold text-ink-900">{customer.name}</span>}
            {customer.name && customer.email && <br />}
            {customer.email}
          </p>
          <Link href={next} className="btn-primary mt-6 w-full">
            {next === "/book" ? "Continue to booking" : next === "/account" ? "View my bookings" : "Continue"} <Icon name="arrowRight" className="size-[18px]" />
          </Link>
          {next !== "/account" && (
            <Link href="/account" className="btn-outline mt-2 w-full">
              <Icon name="list" className="size-[18px]" /> My bookings
            </Link>
          )}
          <button type="button" onClick={signOut} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-forest-700">
            <Icon name="logout" className="size-4" /> Log out
          </button>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-2xl font-extrabold text-forest-900">Log in to Carekar</h1>
          <p className="mt-1 text-ink-600">
            Use your Google account to confirm bookings and see your bookings and running subscriptions. No password needed.
          </p>
          <div className="mt-6 space-y-3">
            <InAppBrowserNote location="login_page" />
            <GoogleButton onClick={onSignIn} busy={busy} />
            {error && (
              <p className="flex gap-2 text-sm font-medium text-danger" role="alert">
                <Icon name="alert" className="size-5 shrink-0" /> {error}
              </p>
            )}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-ink-400">
            We only receive your name and email from Google. See our{" "}
            <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
          </p>
        </>
      )}
    </section>
  );
}
