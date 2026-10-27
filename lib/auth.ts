// Dashboard login cookies. Imported by middleware, so keep this file free of server-only code.
// The team logs in with Google; the API checks the session and role on every request (lib/admin.ts).
export const ADMIN_COOKIE = "ck_admin"; // dashboard session token from POST /api/admin/session
export const STAFF_COOKIE = "ck_staff"; // lets the tracker skip team visits
