import { PublicLayout } from "@/components/layout/PublicLayout";
import { LegalDocumentPage } from "@/components/basalim/LegalDocumentPage";
import { LEGAL_UPDATED, PRIVACY } from "@/lib/basalim/legal-copy";

export default async function LegalPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <LegalDocumentPage
        locale={locale}
        titleEn={PRIVACY.titleEn}
        titleAr={PRIVACY.titleAr}
        paragraphsEn={PRIVACY.en}
        paragraphsAr={PRIVACY.ar}
        updated={LEGAL_UPDATED}
      />
    </PublicLayout>
  );
}
