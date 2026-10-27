import type { Metadata } from "next";
import { AccountBookings } from "@/components/site/AccountBookings";

export const metadata: Metadata = {
  title: "My bookings",
  description: "See your Carekar bookings and running subscriptions.",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <AccountBookings />
    </div>
  );
}
