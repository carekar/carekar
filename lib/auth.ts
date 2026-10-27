// Preview login (used only while Supabase Auth isn't configured). Imported by middleware,
// so keep this file free of server-only code. Real logins live in lib/admin.ts.
export const ADMIN_COOKIE = "ck_admin";
export const STAFF_COOKIE = "ck_staff"; // lets the tracker skip team visits
export const adminToken = () => process.env.ADMIN_TOKEN || "dev-preview-token";
export const adminPassword = () => process.env.ADMIN_PASSWORD || "carekar-admin";
