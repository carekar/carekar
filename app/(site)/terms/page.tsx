import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { formatINR } from "@/lib/site";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default async function Terms() {
  const { plans } = await getConfig();
  return (
    <LegalPage title="Terms & Conditions" updated="27 October 2026">
      <h2>Service</h2>
      <ul>
        <li>Each monthly plan includes 26 scheduled exterior cleaning visits per month.</li>
        <li>Car plans also include interior cleaning once every week.</li>
        <li>Service updates are shared on WhatsApp.</li>
        <li>Service starts only after Carekar confirms availability in your society and the payment is received.</li>
      </ul>
      <h2>Plans & pricing</h2>
      <ul>
        {plans.map((p) => (
          <li key={p.vehicle}>
            {p.label}: {formatINR(p.price)}/month
          </li>
        ))}
      </ul>
      <p>Prices may change with prior notice. Changes apply from the next billing cycle.</p>
      <h2>Customer responsibilities</h2>
      <ul>
        <li>Provide correct parking location and vehicle details.</li>
        <li>Coordinate access to the vehicle for weekly interior cleaning.</li>
        <li>Remove valuables from the vehicle before interior cleaning.</li>
      </ul>
      <h2>Missed visits & liability</h2>
      <p>[To be confirmed by Carekar: policy for missed visits, weather days, and damage claims.]</p>
    </LegalPage>
  );
}
