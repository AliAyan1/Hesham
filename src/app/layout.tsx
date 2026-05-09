import type { ReactNode } from "react";
import { DEFAULT_LOCALE, RTL_LOCALES } from "@/lib/constants";
import "./globals.css";

const defaultDir = RTL_LOCALES.includes(DEFAULT_LOCALE) ? "rtl" : "ltr";

/** Root shell required by Next.js; `lang`/`dir` are synced per-locale in [locale] via HtmlLocaleSync. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} dir={defaultDir} suppressHydrationWarning>
      <body className="m-0 min-h-screen bg-gray-50 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
