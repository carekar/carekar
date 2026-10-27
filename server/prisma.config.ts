import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env", quiet: true });

// Migrations use DIRECT_URL (Supabase Session pooler, port 5432). The API itself uses
// DATABASE_URL (Transaction pooler, port 6543) through src/db/client.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "" },
});
