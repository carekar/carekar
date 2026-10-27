import "server-only";
import { api } from "./api";
import type { DB } from "./types";

export * from "./types";

/** Everything the admin dashboard needs, from the API (staff get no payments). */
export const readDB = () => api<DB>("/api/admin/data");
