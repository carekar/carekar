import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Carekar — Car Cleaning Subscription in Greater Noida West | From ₹249/month",
    template: "%s | Carekar",
  },
  description:
    "Premium, hassle-free car & bike cleaning at your society in Greater Noida West. 26 exterior cleaning visits a month, weekly interior cleaning, WhatsApp updates. Plans from ₹249/month.",
  keywords: ["car cleaning Greater Noida West", "car wash subscription", "daily car cleaning society", "bike cleaning Greater Noida West", "Carekar"],
  openGraph: {
    title: "Carekar — Your Car. Our Care.",
    description: "Monthly car & bike cleaning at your society in Greater Noida West. Plans from ₹249/month.",
    images: ["/images/hero-carekar.webp"],
    locale: "en_IN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a3d24",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
