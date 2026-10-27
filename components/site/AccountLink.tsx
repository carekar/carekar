"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { CUSTOMER_EVENT, CUSTOMER_KEY } from "@/lib/firebase-keys";

/** Header "Login" button; once logged in it shows the first name and opens My bookings. Doesn't load Firebase. */
export function AccountLink() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const c = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null") as { name?: string; email?: string } | null;
        setName(c ? c.name?.split(" ")[0] || c.email?.split("@")[0] || "Account" : null);
      } catch {
        setName(null);
      }
    };
    read();
    window.addEventListener(CUSTOMER_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(CUSTOMER_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return (
    <Link
      href={name ? "/account" : "/login?next=/account"}
      aria-label={name ? `My bookings: ${name}` : "Log in"}
      className="flex min-h-11 items-center gap-1.5 rounded-full border border-forest-700/15 bg-white px-3.5 text-sm font-semibold text-forest-700"
    >
      <Icon name="user" className="size-[18px]" />
      <span className="max-w-[7rem] truncate">{name ? `Hi, ${name}` : "Login"}</span>
    </Link>
  );
}
