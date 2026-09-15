import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function parseServerEnv(): ServerEnv | null {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] validation failed:", parsed.error.flatten().fieldErrors);
    return null;
  }
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    console.error("[env] AUTH_SECRET or NEXTAUTH_SECRET (min 32 chars) is required");
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing AUTH_SECRET / NEXTAUTH_SECRET");
    }
    return null;
  }
  return parsed.data;
}

/** Validated server env; throws in production when required vars are missing. */
export const serverEnv: ServerEnv | null = parseServerEnv();
