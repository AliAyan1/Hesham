/**
 * Locale-agnostic path prefixes allowed without dashboard session.
 * Matched against pathAfterLocale (e.g. `/services/foo`).
 */
export const PUBLIC_PATH_PREFIXES = [
  "/",
  "/about",
  "/services",
  "/industries",
  "/insights",
  "/clients",
  "/careers",
  "/contact",
  "/legal",
  "/pricing",
  "/privacy",
  "/terms",
  "/jobs",
  "/qudrahtech",
  "/qudratak",
  "/login",
  "/register",
  "/auth/login",
  "/auth/register",
  "/auth/register/complete",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/forgot-password",
  "/upgrade",
  "/payments",
  "/maintenance",
  "/onboarding",
  "/api/auth",
  "/api/health",
  "/api/contact",
  "/api/cms",
  "/api/settings/public",
  "/api/jobs",
  "/api/payments/callback",
  "/api/payments/tabby/callback",
  "/api/payments/tamara/callback",
  "/api/payments/tamara/webhook",
] as const;

export function isPublicPath(pathWithoutLocale: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) =>
      pathWithoutLocale === prefix ||
      (prefix !== "/" && pathWithoutLocale.startsWith(`${prefix}/`)),
  );
}
