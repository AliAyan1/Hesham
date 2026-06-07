/**
 * Normalizes DATABASE_URL for serverless (Vercel) — one connection per warm instance.
 */
export function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Prisma client cannot connect.");
  }

  if (!process.env.VERCEL || raw.includes("connection_limit=")) {
    return raw;
  }

  const sep = raw.includes("?") ? "&" : "?";
  return `${raw}${sep}connection_limit=1`;
}
