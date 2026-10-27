import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { TrackedLink } from "./TrackedLink";
import { AccountLink } from "./AccountLink";
import { telHref } from "@/lib/config";
import { getConfig } from "@/lib/settings";

export async function Header() {
  const { contact } = await getConfig();
  return (
    <header className="sticky top-0 z-40 border-b border-cream-200/80 bg-cream-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Carekar home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-600 md:flex">
          <a href="/#plans" className="hover:text-forest-700">Plans</a>
          <a href="/#how" className="hover:text-forest-700">How it works</a>
          <a href="/#area" className="hover:text-forest-700">Service area</a>
          <a href="/#faq" className="hover:text-forest-700">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <AccountLink />
          <TrackedLink
            href={telHref(contact.phone)}
            event="call_clicked"
            props={{ location: "header" }}
            aria-label="Call Carekar"
            className="grid size-11 place-items-center rounded-full border border-forest-700/15 bg-white text-forest-700"
          >
            <Icon name="phone" className="size-[18px]" />
          </TrackedLink>
          <TrackedLink href="/book" event="book_clicked" props={{ location: "header" }} className="btn-primary hidden !min-h-11 !px-5 text-sm md:inline-flex">
            Book Now
          </TrackedLink>
        </div>
      </div>
    </header>
  );
}
