/**
 * Share the session cookie across apex and www (e.g. basalim-consulting.com ↔ www).
 * Hostinger redirects apex → www; without a parent domain, login cookies may not persist.
 */
export function getAuthCookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;

  const explicit = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;

  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  if (!base) return undefined;

  try {
    const host = new URL(base).hostname;
    if (host === "localhost" || host === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return undefined;
    }
    const parts = host.split(".");
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join(".")}`;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
