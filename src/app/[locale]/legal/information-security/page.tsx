import { PublicLayout } from "@/components/layout/PublicLayout";
import { LegalDocumentPage } from "@/components/basalim/LegalDocumentPage";
import { INFO_SECURITY, LEGAL_UPDATED } from "@/lib/basalim/legal-copy";

export default async function LegalInfoSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <LegalDocumentPage
        locale={locale}
        titleEn={INFO_SECURITY.titleEn}
        titleAr={INFO_SECURITY.titleAr}
        paragraphsEn={INFO_SECURITY.en}
        paragraphsAr={INFO_SECURITY.ar}
        updated={LEGAL_UPDATED}
      />
    </PublicLayout>
  );
}
