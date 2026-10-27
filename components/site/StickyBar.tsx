"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { TrackedLink } from "./TrackedLink";
import { waHref } from "@/lib/config";
import { useConfig } from "./ConfigProvider";

/** Always-visible thumb-zone actions on phones. Hides while the keyboard is open. */
export function StickyBar() {
  const pathname = usePathname();
  const { contact } = useConfig();
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && t.matches("input, textarea, select");
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => isField(e.target) && setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  if (pathname.startsWith("/book")) return null; // booking flow has its own bottom action

  return (
    <div
      className={
        "pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 px-4 pt-3 backdrop-blur-md transition-transform md:hidden " +
        (typing ? "translate-y-full" : "")
      }
    >
      <div className="mx-auto flex max-w-md gap-3">
        <TrackedLink
          href={waHref(contact.whatsapp, "Hi Carekar, I'd like to know more about your car cleaning plans.")}
          event="whatsapp_clicked"
          props={{ location: "sticky_bar" }}
          className="btn-wa flex-1 !px-3"
        >
          <Icon name="whatsapp" /> WhatsApp
        </TrackedLink>
        <TrackedLink href="/book" event="book_clicked" props={{ location: "sticky_bar" }} className="btn-primary flex-[1.3] !px-3">
          Book Now <Icon name="arrowRight" className="size-[18px]" />
        </TrackedLink>
      </div>
    </div>
  );
}
