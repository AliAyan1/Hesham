import { PublicLayout } from "@/components/layout/PublicLayout";
import { BasalimHomePage } from "@/components/basalim/BasalimHomePage";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>
      <BasalimHomePage locale={locale} />
    </PublicLayout>
  );
}
