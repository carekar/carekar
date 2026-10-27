"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { startTracking, track } from "@/lib/track";

/** Page-level tracking: session/page view, scroll depth, section views, engagement. */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    startTracking();

    let engaged = false;
    const engage = (trigger: string) => {
      if (engaged) return;
      engaged = true;
      track("engaged", { trigger });
    };
    const timeout = setTimeout(() => engage("time"), 15000);
    const onClick = () => engage("click");

    const marks = new Set<number>();
    const onScroll = () => {
      const h = document.documentElement;
      const pct = ((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100;
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m - 2 && !marks.has(m)) {
          marks.add(m);
          track("scroll_depth", { depth: m });
          if (m >= 50) engage("scroll");
        }
      }
    };

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.section!;
          if (e.isIntersecting && !seen.has(id)) {
            seen.add(id);
            track("section_view", { section: id });
          }
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll("[data-section]").forEach((el) => io.observe(el));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick, { once: true });
    return () => {
      clearTimeout(timeout);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick);
    };
  }, [pathname]);

  return null;
}
