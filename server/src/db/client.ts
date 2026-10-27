import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// One Prisma client (and connection pool) for the whole server process.

let client: PrismaClient | undefined;

export function prisma() {
  client ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // Supabase's certificate isn't in Node's default trust store
      ssl: { rejectUnauthorized: false },
    }),
  });
  return client;
}
