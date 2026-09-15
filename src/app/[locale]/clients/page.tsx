import { PublicLayout } from "@/components/layout/PublicLayout";
import { ClientsBasalimPage } from "@/components/basalim/ClientsBasalimPage";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <ClientsBasalimPage locale={locale} />
    </PublicLayout>
  );
}
