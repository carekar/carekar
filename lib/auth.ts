// Admin login: one shared password for the team. Imported by middleware, so keep this file
// free of server-only code. In production nothing has a default: a missing or too-short
// ADMIN_PASSWORD / ADMIN_TOKEN disables the admin login instead of falling back to a known value.
export const ADMIN_COOKIE = "ck_admin";
export const STAFF_COOKIE = "ck_staff"; // lets the tracker skip team visits

const prod = process.env.NODE_ENV === "production";
const MIN_TOKEN = 24;
const MIN_PASSWORD = 10;

/** Sent to the API as the bearer token; must equal ADMIN_TOKEN on the API (server/.env). */
export function adminToken() {
  const t = process.env.ADMIN_TOKEN || "";
  if (prod) return t.length >= MIN_TOKEN ? t : "";
  return t || "dev-preview-token";
}

export function adminPassword() {
  const p = process.env.ADMIN_PASSWORD || "";
  if (prod) return p.length >= MIN_PASSWORD ? p : "";
  return p || "carekar-admin";
}

/** False in production until ADMIN_PASSWORD and ADMIN_TOKEN are both set. */
export const adminLoginReady = () => !!adminToken() && !!adminPassword();
