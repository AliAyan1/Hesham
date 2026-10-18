import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ServicesOverviewPage } from "@/components/basalim/ServicesOverviewPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "خدماتنا | استشارات بصيلم" : "Our Services | Basalim Consulting";
  const description = isAr
    ? "اكتشف خدماتنا الاستشارية في التوظيف والاستشارات التجارية وحلول الموارد البشرية للشركات في المملكة."
    : "Explore our consulting services including recruitment, business advisory, and HR solutions for KSA businesses.";
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function ServicesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>
      <ServicesOverviewPage locale={locale} />
    </PublicLayout>
  );
}
