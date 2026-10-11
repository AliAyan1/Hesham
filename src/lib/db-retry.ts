import { isPrismaConnectionError } from "@/lib/db";

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
};

/**
 * Retry transient Postgres / pool errors (Railway sleep, Vercel cold start, pool timeout).
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 350;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isPrismaConnectionError(error) || attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }

  throw lastError;
}
