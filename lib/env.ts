// Environment helpers. No "server-only" here because middleware imports it too.

/** The Express API in server/. The browser reaches it through the /api/* rewrite in next.config.ts. */
export const apiUrl = () => (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
