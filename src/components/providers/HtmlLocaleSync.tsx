"use client";

import { type ReactNode, useEffect } from "react";
import type { Locale } from "@/lib/constants";
import { RTL_LOCALES } from "@/lib/constants";

/** Sets <html lang dir> from the active route locale (root layout cannot read [locale] param). */
export function HtmlLocaleSync({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }, [locale]);
  return <>{children}</>;
}
