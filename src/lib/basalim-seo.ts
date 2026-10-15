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

export function basalimMetadataBase(): URL {
  const origin = siteOrigin();
  if (origin.includes("basalim-consulting.com") && !origin.includes("www.")) {
    return new URL(origin.replace("basalim-consulting.com", "www.basalim-consulting.com"));
  }
  return new URL(origin);
}

/** WhatsApp / iMessage / LinkedIn always read these English OG tags (not the Arabic page title). */
export function basalimLinkPreviewOpenGraph(): NonNullable<Metadata["openGraph"]> {
  const base = basalimMetadataBase();
  return {
    type: "website",
    siteName: BASALIM_OG_SITE_NAME,
    title: BASALIM_HOME_TITLE_EN,
    description: BASALIM_META_DESCRIPTION_EN,
    url: base.href,
    locale: "en_US",
    alternateLocale: ["ar_SA"],
    images: [
      {
        url: "/logo-basalim-nav.png",
        width: 681,
        height: 465,
        alt: "Basalim Consulting",
      },
    ],
  };
}

export function basalimLinkPreviewTwitter(): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: "Basalim Consulting",
    description: BASALIM_META_DESCRIPTION_EN,
    images: ["/logo-basalim-nav.png"],
  };
}

export function basalimMetaDescription(locale: string): string {
  return locale === "ar" ? BASALIM_META_DESCRIPTION_AR : BASALIM_META_DESCRIPTION_EN;
}

export function basalimTwitterTitle(locale: string): string {
  return locale === "ar" ? "باسالم كونسلتينج" : "Basalim Consulting";
}

/** Site-wide defaults ([locale]/layout.tsx). */
export function basalimSiteMetadata(): Metadata {
  return {
    metadataBase: basalimMetadataBase(),
    applicationName: BASALIM_SITE_NAME,
    title: BASALIM_HOME_TITLE_EN,
    description: BASALIM_META_DESCRIPTION_EN,
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
    openGraph: basalimLinkPreviewOpenGraph(),
    twitter: basalimLinkPreviewTwitter(),
  };
}

/** Default metadata for the Basalim marketing site (locale layout). */
export function createBasalimRootMetadata(locale: string): Metadata {
  const description = basalimMetaDescription(locale);
  const defaultTitle =
    locale === "ar" ? "باسالم كونسلتينج | السعودية" : "Basalim Consulting | KSA";

  return {
    metadataBase: basalimMetadataBase(),
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
    openGraph: basalimLinkPreviewOpenGraph(),
    twitter: basalimLinkPreviewTwitter(),
  };
}

/** Homepage — browser title by locale; link previews stay English Basalim. */
export function createBasalimHomeMetadata(locale: string): Metadata {
  const description = basalimMetaDescription(locale);
  const title =
    locale === "ar" ? BASALIM_HOME_TITLE_AR : BASALIM_HOME_TITLE_EN;

  return {
    title,
    description,
    openGraph: basalimLinkPreviewOpenGraph(),
    twitter: basalimLinkPreviewTwitter(),
  };
}
