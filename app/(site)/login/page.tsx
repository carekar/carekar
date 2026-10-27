import type { Metadata } from "next";
import { LoginPanel } from "@/components/site/LoginPanel";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Carekar with your Google account to confirm and track your booking.",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // only same-site paths, so the link can't send people to another website
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : "/book";
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <LoginPanel next={safeNext} />
    </div>
  );
}
