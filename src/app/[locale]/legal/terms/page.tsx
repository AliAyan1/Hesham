import { PublicLayout } from "@/components/layout/PublicLayout";
import { LegalDocumentPage } from "@/components/basalim/LegalDocumentPage";
import { LEGAL_UPDATED, TERMS } from "@/lib/basalim/legal-copy";

export default async function LegalTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <LegalDocumentPage
        locale={locale}
        titleEn={TERMS.titleEn}
        titleAr={TERMS.titleAr}
        paragraphsEn={TERMS.en}
        paragraphsAr={TERMS.ar}
        updated={LEGAL_UPDATED}
      />
    </PublicLayout>
  );
}
