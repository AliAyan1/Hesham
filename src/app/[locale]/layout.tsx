import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Cairo, Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { LocaleHydration } from "@/components/providers/LocaleHydration";
import { HtmlLocaleSync } from "@/components/providers/HtmlLocaleSync";
import { RTL_LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import "../globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "QudrahTech | قدرتك - AI Career Platform",
  description:
    "AI-powered career assessments, ATS-optimized CVs, and smart job matching for job seekers and employers.",
  keywords: [
    "QudrahTech",
    "قدرتك",
    "AI career platform",
    "ATS CV builder",
    "AI assessment",
    "job matching",
    "Saudi Arabia",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "QudrahTech",
    title: "QudrahTech | قدرتك - AI Career Platform",
    description:
      "AI-powered career assessments, ATS-optimized CVs, and smart job matching for job seekers and employers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QudrahTech | قدرتك",
    description: "Know Your Potential. Shape Your Future.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F4C75",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const isRTL = RTL_LOCALES.includes(locale as Locale);
  const session = await auth();

  return (
    <HtmlLocaleSync locale={locale as Locale}>
      <div
        className={cn(
          "min-h-screen max-w-[100vw] bg-gray-50 text-gray-900 antialiased overflow-x-clip",
          isRTL ? cairo.className : plusJakarta.className,
          cairo.variable,
          plusJakarta.variable,
        )}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider session={session}>
            <LocaleHydration />
            {children}
          </SessionProvider>
        </NextIntlClientProvider>
      </div>
    </HtmlLocaleSync>
  );
}
