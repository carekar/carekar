"use client";

import { createContext, useContext } from "react";
import { defaultConfig, type SiteConfig } from "@/lib/config";

const Ctx = createContext<SiteConfig>(defaultConfig);

export function ConfigProvider({ value, children }: { value: SiteConfig; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Prices, contact numbers and societies as set in admin → Settings. */
export const useConfig = () => useContext(Ctx);
