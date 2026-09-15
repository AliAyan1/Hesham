import { PublicLayout } from "@/components/layout/PublicLayout";
import { ServicesOverviewPage } from "@/components/basalim/ServicesOverviewPage";

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
