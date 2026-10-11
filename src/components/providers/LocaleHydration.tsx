"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import {
  applyDocumentDirection,
  migrateLegacyLocaleStorage,
  isLocale,
  pathnameWithLocale,
  persistLocalePreference,
  LOCALE_STORAGE_KEY,
} from "@/lib/locale-preference";

/** Sync dir/lang, migrated storage keys, align URL with saved locale when needed */
export function LocaleHydration() {
  const intlLocale = useLocale();

  useEffect(() => {
    migrateLegacyLocaleStorage();
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    if (pathname.includes("/auth/login") || pathname.includes("/auth/register")) {
      applyDocumentDirection(intlLocale);
      persistLocalePreference(intlLocale);
      return;
    }

    const pathSeg = pathname.split("/").filter(Boolean)[0];
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);

    if (stored && isLocale(stored) && isLocale(pathSeg) && stored !== pathSeg) {
      const nextPath = pathnameWithLocale(stored, window.location.pathname);
      window.location.replace(
        `${nextPath}${window.location.search}${window.location.hash}`,
      );
      return;
    }

    applyDocumentDirection(intlLocale);
    persistLocalePreference(intlLocale);
  }, [intlLocale]);

  return null;
}
