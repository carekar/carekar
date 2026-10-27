import type { Metadata } from "next";
import { BookingForm } from "@/components/site/BookingForm";
import { findPlan } from "@/lib/config";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Book Your Cleaning Plan",
  description: "Book a monthly car or bike cleaning plan, or a one-time car cleaning, in Greater Noida West. Takes less than a minute.",
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ vehicle?: string; service?: string }> }) {
  const { vehicle, service } = await searchParams;
  const config = await getConfig();
  const plan = findPlan(config, vehicle);
  const oneTime = service === "one_time" && !config.oneTime.hidden;
  return (
    <div className="mx-auto max-w-xl px-4">
      <BookingForm
        initialVehicle={oneTime && plan?.vehicle === "bike" ? undefined : plan?.vehicle}
        // a plan card link (?vehicle=…) means a monthly plan; no params keeps whatever the saved draft had
        initialService={oneTime ? "one_time" : service === "subscription" || plan ? "subscription" : undefined}
      />
    </div>
  );
}
