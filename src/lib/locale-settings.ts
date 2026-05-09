/** Locale config only — imported by middleware and helpers without pulling `@prisma/client` into the Edge bundle. */

export const LOCALES = ["ar", "en", "fr", "es", "ur", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const RTL_LOCALES: Locale[] = ["ar", "ur"];
