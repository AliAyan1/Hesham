import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Bump when Assessment (or other) Prisma models change so dev HMR picks up `prisma generate`. */
const PRISMA_CLIENT_REVISION = "2026-talent-pool-invites-v1";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRevision?: string;
};

/**
 * Get Prisma client (lazy singleton).
 *
 * Note: This must be lazy because Next.js may import modules at build-time.
 * We only create the client when it’s actually needed at runtime.
 */
export function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && globalForPrisma.prismaRevision === PRISMA_CLIENT_REVISION) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect();
    globalForPrisma.prisma = undefined;
  }

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
    globalForPrisma.prismaRevision = PRISMA_CLIENT_REVISION;
  }

  return client;
}
