import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/book", "/contact", "/privacy-policy", "/terms", "/refund-cancellation"].map((p) => ({
    url: site.url + p,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.6,
  }));
}
