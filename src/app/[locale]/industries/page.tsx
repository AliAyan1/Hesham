import { PublicLayout } from "@/components/layout/PublicLayout";
import { IndustriesOverviewPage } from "@/components/basalim/IndustriesOverviewPage";

export default async function IndustriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <IndustriesOverviewPage locale={locale} />
    </PublicLayout>
  );
}
