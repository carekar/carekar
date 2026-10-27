"use client";

import Link from "next/link";
import { track } from "@/lib/track";

type Props = React.ComponentProps<"a"> & {
  href: string;
  event: string;
  props?: Record<string, string | number | boolean | null>;
};

/** Link that records a funnel event on tap. External links (wa.me, tel:) open normally. */
export function TrackedLink({ href, event, props, onClick, children, ...rest }: Props) {
  const handle = (e: React.MouseEvent<HTMLAnchorElement>) => {
    track(event, props);
    onClick?.(e);
  };
  if (href.startsWith("/")) {
    return (
      <Link href={href} onClick={handle} {...rest}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a href={href} onClick={handle} {...(external ? { target: "_blank", rel: "noopener" } : {})} {...rest}>
      {children}
    </a>
  );
}
