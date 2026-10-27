// Placeholder logo built in SVG — replace with the client's original Carekar logo file.

export function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  const main = light ? "#ffffff" : "var(--color-forest-900)";
  return (
    <span className={"inline-flex items-center gap-2 " + className}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true">
        <path d="M33 12.5A15 15 0 1 0 33 27.5" fill="none" stroke={main} strokeWidth="5.5" strokeLinecap="round" />
        <path d="M12.5 23.5l1.6-4.2a2 2 0 0 1 1.9-1.3h8a2 2 0 0 1 1.9 1.3l1.6 4.2v3.5h-15z" fill="var(--color-leaf-400)" />
        <circle cx="15.5" cy="27" r="1.6" fill={main} />
        <circle cx="24.5" cy="27" r="1.6" fill={main} />
        <path d="M33.5 4.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" fill="var(--color-sun-400)" />
      </svg>
      <span className="leading-none">
        <span className="font-display text-[22px] font-extrabold tracking-tight" style={{ color: main }}>
          care<span className={light ? "text-leaf-400" : "text-forest-700"}>kar</span>
        </span>
        <span className={"mt-0.5 block text-[9.5px] font-semibold uppercase tracking-[0.2em] " + (light ? "text-white/70" : "text-ink-600")}>
          Your Car • Our Care
        </span>
      </span>
    </span>
  );
}
