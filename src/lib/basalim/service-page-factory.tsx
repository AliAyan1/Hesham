import { PublicLayout } from "@/components/layout/PublicLayout";
import { ServiceDetailPage } from "@/components/basalim/ServiceDetailPage";
import { SERVICE_PAGES } from "@/lib/basalim/services-data";
import { notFound } from "next/navigation";

export function createServicePage(slug: string) {
  return async function ServiceRoutePage({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    const config = SERVICE_PAGES[slug];
    if (!config) notFound();

    return (
      <PublicLayout locale={locale}>
        <ServiceDetailPage locale={locale} config={config} />
      </PublicLayout>
    );
  };
}
