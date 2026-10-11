import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

/** Auth.js uses `__Secure-*` session cookies on HTTPS; middleware must match. */
export function authUsesSecureSessionCookie(): boolean {
  const explicit = process.env.AUTH_SECURE_COOKIE?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function getAuthJwtFromRequest(
  request: NextRequest,
): Promise<JWT | null> {
  const secret = getAuthSecret();
  if (!secret) return null;
  return getToken({
    req: request,
    secret,
    secureCookie: authUsesSecureSessionCookie(),
  });
}
