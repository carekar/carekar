import type { Metadata } from "next";
import { BookingForm } from "@/components/site/BookingForm";
import { findPlan } from "@/lib/config";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Book Your Cleaning Plan",
  description: "Book a monthly car or bike cleaning plan in Greater Noida West. Takes less than a minute.",
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ vehicle?: string }> }) {
  const { vehicle } = await searchParams;
  const plan = findPlan(await getConfig(), vehicle);
  return (
    <div className="mx-auto max-w-xl px-4">
      <BookingForm initialVehicle={plan?.vehicle} />
    </div>
  );
}
