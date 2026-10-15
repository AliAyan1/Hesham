import type { ReactNode } from "react";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { DEFAULT_LOCALE, RTL_LOCALES } from "@/lib/constants";
import { basalimLinkPreviewOpenGraph, basalimLinkPreviewTwitter, basalimMetadataBase } from "@/lib/basalim-seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: basalimMetadataBase(),
  verification: {
    google: "5pXsJLIy6nzStRrtSA9HnP1oA29-g75VUPFvtXAaQ70",
  },
  openGraph: basalimLinkPreviewOpenGraph(),
  twitter: basalimLinkPreviewTwitter(),
};

const GA_MEASUREMENT_ID = "G-HT2501LY4G";

const defaultDir = RTL_LOCALES.includes(DEFAULT_LOCALE) ? "rtl" : "ltr";

/** Root shell required by Next.js; `lang`/`dir` are synced per-locale in [locale] via HtmlLocaleSync. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} dir={defaultDir} suppressHydrationWarning>
      <body className="m-0 min-h-screen bg-gray-50 antialiased" suppressHydrationWarning>
        {children}
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}
