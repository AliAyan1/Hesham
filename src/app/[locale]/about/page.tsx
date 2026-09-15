import { PublicLayout } from "@/components/layout/PublicLayout";
import { AboutBasalimPage } from "@/components/basalim/AboutBasalimPage";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>
      <AboutBasalimPage locale={locale} />
    </PublicLayout>
  );
}
