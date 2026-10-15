import type { Metadata } from "next";
import { siteOrigin } from "@/lib/basalim-public";

/** Full application / publisher name (EN | AR). */
export const BASALIM_SITE_NAME = "Basalim Consulting | باسالم كونسلتينج";

export const BASALIM_OG_SITE_NAME = "Basalim Consulting";

export const BASALIM_META_DESCRIPTION_EN =
  "Basalim Consulting is a leading talent acquisition and HR consultancy in Saudi Arabia, powered by QudrahTech AI platform.";

export const BASALIM_META_DESCRIPTION_AR =
  "باسالم كونسلتينج — استشارات توظيف واختيار المواهب في المملكة العربية السعودية";

export const BASALIM_HOME_TITLE_EN =
  "Basalim Consulting — Talent & Recruitment Solutions | KSA";

export const BASALIM_HOME_TITLE_AR =
  "باسالم كونسلتينج — حلول المواهب والتوظيف | السعودية";

export function basalimMetaDescription(locale: string): string {
  return locale === "ar" ? BASALIM_META_DESCRIPTION_AR : BASALIM_META_DESCRIPTION_EN;
}

export function basalimTwitterTitle(locale: string): string {
  return locale === "ar" ? "باسالم كونسلتينج" : "Basalim Consulting";
}

/** Default metadata for the Basalim marketing site (locale layout). */
export function createBasalimRootMetadata(locale: string): Metadata {
  const description = basalimMetaDescription(locale);
  const defaultTitle =
    locale === "ar" ? "باسالم كونسلتينج | السعودية" : "Basalim Consulting | KSA";

  return {
    metadataBase: new URL(siteOrigin()),
    applicationName: BASALIM_SITE_NAME,
    title: {
      default: defaultTitle,
      template: `%s | ${BASALIM_OG_SITE_NAME}`,
    },
    description,
    keywords: [
      "Basalim Consulting",
      "باسالم كونسلتينج",
      "talent acquisition",
      "HR consultancy",
      "recruitment",
      "Saudi Arabia",
      "KSA",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: BASALIM_OG_SITE_NAME,
      title: defaultTitle,
      description,
      locale: locale === "ar" ? "ar_SA" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: basalimTwitterTitle(locale),
      description,
    },
  };
}

/** Homepage — full marketing title. */
export function createBasalimHomeMetadata(locale: string): Metadata {
  const description = basalimMetaDescription(locale);
  const title =
    locale === "ar" ? BASALIM_HOME_TITLE_AR : BASALIM_HOME_TITLE_EN;

  return {
    title,
    description,
    openGraph: {
      siteName: BASALIM_OG_SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: basalimTwitterTitle(locale),
      description,
    },
  };
}
