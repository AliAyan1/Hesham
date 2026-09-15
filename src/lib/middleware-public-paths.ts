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
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
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
