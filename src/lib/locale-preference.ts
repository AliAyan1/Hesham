import { LOCALES, type Locale } from "@/lib/constants";

export const LOCALE_STORAGE_KEY = "qudrahtech-locale";
export const LEGACY_LOCALE_STORAGE_KEY = "qudrahtech-preferred-locale";

export function isLocale(segment: string | undefined | null): segment is Locale {
  return !!segment && (LOCALES as readonly string[]).includes(segment);
}

/**
 * Builds a pathname with leading locale segment, preserving the route after the locale.
 * Example: `en`, `/ar/dashboard/x` → `/en/dashboard/x`
 */
export function pathnameWithLocale(locale: string, pathname: string): string {
  const pathOnly = pathname.split("?")[0] ?? "/";
  const rest = pathOnly.replace(/^\/[^/]+/, "") || "/";
  const tail = rest === "/" ? "" : rest;
  return `/${locale}${tail}`;
}

export function persistLocalePreference(locale: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore quota */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function applyDocumentDirection(locale: string): void {
  if (typeof document === "undefined") return;
  const isRtl = locale === "ar" || locale === "ur";
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}

export function migrateLegacyLocaleStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const current = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const legacy = window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
    if (!current && legacy && isLocale(legacy)) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, legacy);
    }
    if (legacy) {
      window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
