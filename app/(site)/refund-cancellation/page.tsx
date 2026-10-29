import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Refund & Cancellation Policy" };

export default function Refund() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="27 October 2026">
      <h2>Cancellation</h2>
      <p>You can cancel your subscription at any time by messaging us on WhatsApp. [Notice period to be confirmed by Carekar.]</p>
      <h2>Refunds</h2>
      <p>[To be confirmed by Carekar: whether partial months are refunded pro-rata, and the refund timeline.]</p>
      <h2>Service not available</h2>
      <p>If you pay when booking and we cannot start the service in your society, the full amount is refunded.</p>
      <h2>Failed auto-debit</h2>
      <p>If a monthly auto-debit fails, we will notify you on WhatsApp and share a payment link. Service may be paused until payment is completed.</p>
    </LegalPage>
  );
}
