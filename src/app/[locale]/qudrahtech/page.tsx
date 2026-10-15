import type { Metadata } from "next";
import { QudrahtechLandingPage } from "@/components/landing/QudrahtechLandingPage";
import { createQudrahtechMarketingMetadata } from "@/lib/qudrahtech-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createQudrahtechMarketingMetadata(locale);
}

/** Qudrahtech product marketing (pricing, mentors, jobs) on basalim-consulting.com */
export default async function QudrahtechMarketingPage({  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <QudrahtechLandingPage locale={locale} />;
}
