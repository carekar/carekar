"use client";

import { useState } from "react";

const presets: Record<string, { source: string; medium: string }> = {
  "Poster / QR": { source: "poster", medium: "qr" },
  "WhatsApp group": { source: "whatsapp", medium: "social" },
  "Instagram / Facebook ad": { source: "meta", medium: "paid" },
  "Google ad": { source: "google", medium: "cpc" },
  Referral: { source: "friend", medium: "referral" },
};

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Builds tagged links so every poster, society group and ad is measurable in Funnel → Sources. */
export function LinkBuilder({ baseUrl }: { baseUrl: string }) {
  const [type, setType] = useState("Poster / QR");
  const [campaign, setCampaign] = useState("gaur-city-2");
  const [content, setContent] = useState("lift-lobby");
  const [copied, setCopied] = useState(false);
  const p = presets[type];
  const params = new URLSearchParams({ utm_source: p.source, utm_medium: p.medium, utm_campaign: slug(campaign) });
  if (content) params.set("utm_content", slug(content));
  const url = `${baseUrl}/?${params}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(url)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(presets).map((k) => (
          <button key={k} type="button" data-active={type === k} onClick={() => setType(k)} className="chip !min-h-9 !px-3 !text-xs">{k}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Campaign / society</span>
          <input className="field" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Placement <span className="font-normal text-ink-400">(optional)</span></span>
          <input className="field" value={content} onChange={(e) => setContent(e.target.value)} placeholder="e.g. lift-lobby, gate" />
        </label>
      </div>
      <div className="break-all rounded-xl bg-cream-50 p-3 font-mono text-xs text-ink-900">{url}</div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary !min-h-11 text-sm"
          onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a href={qr} target="_blank" rel="noopener" className="btn-outline !min-h-11 text-sm">Open QR code</a>
      </div>
      <p className="text-xs text-ink-400">Phase 2: QR generated in-house and saved links listed here (plan.md §10.1).</p>
    </div>
  );
}
