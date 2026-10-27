import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { TrackedLink } from "@/components/site/TrackedLink";
import { site } from "@/lib/site";
import { telHref, waHref } from "@/lib/config";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = { title: "Contact Us" };

export default async function Contact() {
  const { phone, whatsapp, email } = (await getConfig()).contact;
  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-8">
      <h1 className="text-[32px] font-extrabold leading-tight text-forest-900">Contact us</h1>
      <p className="mt-2 text-ink-600">We usually reply on WhatsApp within a few minutes during the day.</p>
      <div className="mt-6 space-y-3">
        <TrackedLink href={waHref(whatsapp, "Hi Carekar!")} event="whatsapp_clicked" props={{ location: "contact_page" }} className="card flex min-h-16 items-center gap-4 p-4">
          <span className="grid size-12 place-items-center rounded-xl bg-[#1faa53] text-white"><Icon name="whatsapp" /></span>
          <span><span className="block font-bold text-forest-900">WhatsApp</span><span className="text-sm text-ink-600">+91 {whatsapp}</span></span>
        </TrackedLink>
        <TrackedLink href={telHref(phone)} event="call_clicked" props={{ location: "contact_page" }} className="card flex min-h-16 items-center gap-4 p-4">
          <span className="grid size-12 place-items-center rounded-xl bg-forest-700 text-white"><Icon name="phone" /></span>
          <span><span className="block font-bold text-forest-900">Call us</span><span className="text-sm text-ink-600">+91 {phone}</span></span>
        </TrackedLink>
        {email && (
          <a href={`mailto:${email}`} className="card flex min-h-16 items-center gap-4 p-4">
            <span className="grid size-12 place-items-center rounded-xl bg-leaf-100 text-forest-700"><Icon name="mail" /></span>
            <span><span className="block font-bold text-forest-900">Email</span><span className="text-sm text-ink-600">{email}</span></span>
          </a>
        )}
        <div className="card flex items-center gap-4 p-4">
          <span className="grid size-12 place-items-center rounded-xl bg-sun-400 text-forest-900"><Icon name="mapPin" /></span>
          <span><span className="block font-bold text-forest-900">Service area</span><span className="text-sm text-ink-600">{site.areaFull}</span></span>
        </div>
      </div>
    </div>
  );
}
