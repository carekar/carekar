import "server-only";
import { cache } from "react";
import { defaultConfig, type SiteConfig } from "./config";
import { api } from "./api";

export const CONFIG_TAG = "config";

/** Current site config for server components. Falls back to defaults if the API is unreachable. */
export const getConfig = cache(async (): Promise<SiteConfig> => {
  try {
    const cfg = await api<Partial<SiteConfig>>("/api/config", { token: null, next: { revalidate: 60, tags: [CONFIG_TAG] } });
    // fields an older API (or cached response) doesn't send yet fall back to the defaults
    return { ...defaultConfig, ...cfg, oneTime: { ...defaultConfig.oneTime, ...cfg.oneTime } };
  } catch (e) {
    console.error("[settings] using defaults:", (e as Error).message);
    return defaultConfig;
  }
});
