/**
 * Normalizes DATABASE_URL for serverless (Vercel) — one connection per warm instance.
 */
export function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Prisma client cannot connect.");
  }

  const qIndex = raw.indexOf("?");
  const base = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const params = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : "");

  if (!params.has("connection_limit")) {
    params.set("connection_limit", "1");
  }
  if (!params.has("pool_timeout")) {
    params.set("pool_timeout", "20");
  }
  if (process.env.VERCEL === "1" && !params.has("pgbouncer")) {
    params.set("pgbouncer", "true");
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
