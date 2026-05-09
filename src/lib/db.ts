import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Get Prisma client (lazy singleton).
 *
 * Note: This must be lazy because Next.js may import modules at build-time.
 * We only create the client when it’s actually needed at runtime.
 */
export function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Prisma client cannot connect.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
