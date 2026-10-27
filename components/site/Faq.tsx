"use client";

import { Icon } from "@/components/Icon";
import { faqs } from "@/lib/site";
import { track } from "@/lib/track";

export function Faq() {
  return (
    <div className="divide-y divide-cream-200 overflow-hidden rounded-[var(--radius-card)] border border-cream-200 bg-white">
      {faqs.map((f, i) => (
        <details
          key={f.q}
          className="group"
          onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track("faq_opened", { question: i })}
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
            {f.q}
            <Icon name="chevronDown" className="size-5 shrink-0 text-forest-700 transition group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
