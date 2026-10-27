import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { site } from "@/lib/site";
import { telHref, waHref } from "@/lib/config";
import { getConfig } from "@/lib/settings";

export async function Footer() {
  const { phone, whatsapp, email } = (await getConfig()).contact;
  return (
    <footer className="bg-forest-900 pb-28 text-white/80 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Subscription-based car and bike cleaning for residential societies and homes in {site.area}.
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-sans text-sm font-bold tracking-normal text-white">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={telHref(phone)} className="inline-flex min-h-6 items-center gap-2 hover:text-white">
                  <Icon name="phone" className="size-4" /> +91 {phone}
                </a>
              </li>
              <li>
                <a href={waHref(whatsapp, "Hi Carekar!")} target="_blank" rel="noopener" className="inline-flex min-h-6 items-center gap-2 hover:text-white">
                  <Icon name="whatsapp" className="size-4" /> WhatsApp us
                </a>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="inline-flex min-h-6 items-center gap-2 hover:text-white">
                    <Icon name="mail" className="size-4" /> {email}
                  </a>
                </li>
              )}
              <li className="inline-flex items-center gap-2">
                <Icon name="mapPin" className="size-4" /> {site.areaFull}
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-sans text-sm font-bold tracking-normal text-white">Company</h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-1">
              <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms & Conditions</Link></li>
              <li><Link href="/refund-cancellation" className="hover:text-white">Refund & Cancellation</Link></li>
              <li><Link href="/credits" className="hover:text-white">Image credits</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} Carekar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
