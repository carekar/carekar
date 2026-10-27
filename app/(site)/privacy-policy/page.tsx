import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/site";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function Privacy() {
  const { contact } = await getConfig();
  return (
    <LegalPage title="Privacy Policy" updated="27 October 2026">
      <p>
        Carekar (&quot;we&quot;, &quot;us&quot;) provides subscription-based vehicle cleaning services in {site.areaFull}. This policy explains what
        personal data we collect through this website and how we use it, in line with the Digital Personal Data Protection Act, 2023.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Booking details: name, mobile/WhatsApp number, society, tower/flat, locality, vehicle type and model, parking details, preferred start date and notes.</li>
        <li>Login details: when you log in with Google to confirm a booking, we receive your name, email address and a Google account ID from Google (through Firebase Authentication). We never see your Google password.</li>
        <li>Payment status from our payment partner Razorpay. We do not store card or UPI details.</li>
        <li>Website usage data: pages visited, buttons tapped, booking-form progress, device and browser type, and the link or campaign that brought you here. This is linked to an anonymous ID stored in your browser.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To confirm service availability in your society and contact you about your booking on WhatsApp or phone.</li>
        <li>To provide, schedule and update you about the cleaning service.</li>
        <li>To process payments and subscriptions.</li>
        <li>To improve our website and understand which channels help customers find us.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We share data only with service providers who help us run Carekar (hosting, database, login, payments, messaging), and never sell your data.</p>
      <h2>Retention</h2>
      <p>Booking data is kept while you are a customer and for up to 24 months afterwards. Website usage data is kept for up to 13 months.</p>
      <h2>Your rights</h2>
      <p>You can ask us to access, correct or delete your data at any time by contacting us on +91 {contact.phone}.</p>
    </LegalPage>
  );
}
