import express, { type ErrorRequestHandler } from "express";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import { hasSupabaseAuth } from "./auth";
import { hasDatabase } from "./repo";

// Carekar API. The website forwards /api/* here (next.config.ts rewrites), so the
// browser only ever talks to the website's own domain and no CORS is needed.

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true); // real visitor IP from X-Forwarded-For (rate limiting)

app.use(express.json({ limit: "100kb" }));
app.use(express.text({ limit: "100kb" })); // older sendBeacon fallbacks post text/plain
app.use((_req, res, next) => {
  res.set("X-Robots-Tag", "noindex");
  next();
});

/** Health check for the host and the keep-alive ping. */
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    database: hasDatabase() ? "postgres" : "file",
    auth: hasSupabaseAuth() ? "supabase" : "preview",
    alerts: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  });
});

app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[api]", err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : "Something went wrong" });
};
app.use(onError);
