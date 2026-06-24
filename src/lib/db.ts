import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/database-url";

/** Bump when Prisma models change so dev HMR picks up `prisma generate`. */
const PRISMA_CLIENT_REVISION = "2026-platform-settings-v1";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRevision?: string;
};

/**
 * Get Prisma client (lazy singleton).
 *
 * Cached in all environments so Vercel warm lambdas reuse one connection per instance.
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

  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  globalForPrisma.prisma = client;
  globalForPrisma.prismaRevision = PRISMA_CLIENT_REVISION;

  return client;
}
