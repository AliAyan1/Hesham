import type { Metadata } from "next";
import { APP_NAME, APP_NAME_AR } from "@/lib/constants";

/** Product landing at /qudrahtech — separate from Basalim corporate defaults. */
export function createQudrahtechMarketingMetadata(locale: string): Metadata {
  const isAr = locale === "ar";
  const title = isAr
    ? `${APP_NAME_AR} | منصة مهنية بالذكاء الاصطناعي`
    : `${APP_NAME} — AI Career Platform`;
  const description = isAr
    ? "تقييمات مهنية، سيرة ذاتية، ومطابقة وظيفية — من باسالم كونسلتينج."
    : "AI assessments, CV tools, and job matching — powered by Basalim Consulting.";

  return {
    title,
    description,
    openGraph: {
      siteName: APP_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: isAr ? APP_NAME_AR : APP_NAME,
      description,
    },
  };
}
