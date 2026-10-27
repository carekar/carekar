import type { NextConfig } from "next";

const apiUrl = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  // lets a production build run alongside `npm run dev` (NEXT_DIST_DIR=.next-build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The booking form and tracker post to /api/*, which is the Express API in server/.
  // Same-origin for the browser, so no CORS and the API URL never appears in the page.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
