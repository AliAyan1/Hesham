import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { IndustryDetailPage } from "@/components/basalim/IndustryDetailPage";
import { INDUSTRY_DETAILS } from "@/lib/basalim/industries-data";

export function createIndustryPage(slug: string) {
  return async function IndustryRoutePage({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    const detail = INDUSTRY_DETAILS[slug];
    if (!detail) notFound();

    return (
      <PublicLayout locale={locale}>
        <IndustryDetailPage locale={locale} industry={detail} />
      </PublicLayout>
    );
  };
}
