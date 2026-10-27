import { buildConfig, defaultConfig } from "../../lib/config";
import { repo } from "./repo";

/** Current site config (prices, visible plans, contact). Falls back to defaults if the database is unreachable. */
export async function getConfig() {
  try {
    return buildConfig(await repo().getSettings());
  } catch (e) {
    console.error("[settings] using defaults:", e);
    return defaultConfig;
  }
}
