import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Serverless hosting starts many short-lived instances, and each one keeps its own connection pool. A small pool per
// instance, short idle and connect timeouts and a statement timeout keep the total under the database's connection limit
// and stop one slow query from holding a connection forever. In production DATABASE_URL must be the Supabase POOLER
// url (port 6543); the direct connection is only for migrations (DIRECT_URL). /api/health reports the wrong one.
const isProd = process.env.NODE_ENV === "production";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const max = Number(process.env.PG_POOL_MAX) || (isProd ? 5 : 10);
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 20_000,
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (!isProd) {
  globalForPrisma.prisma = prisma;
}
