import { QudrahtechLandingPage } from "@/components/landing/QudrahtechLandingPage";

/** Qudrahtech product marketing (pricing, mentors, jobs) on basalim-consulting.com */
export default async function QudrahtechMarketingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <QudrahtechLandingPage locale={locale} />;
}
