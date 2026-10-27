// Environment helpers. No "server-only" here because middleware imports it too.

/** The Express API in server/. The browser reaches it through the /api/* rewrite in next.config.ts. */
export const apiUrl = () => (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");

export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
/** Public anon / publishable key — only used for admin login sessions. */
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

/** Use Supabase Auth email logins for /admin (otherwise the preview password). */
export const hasSupabaseAuth = () => !!supabaseUrl() && !!supabaseAnonKey();
