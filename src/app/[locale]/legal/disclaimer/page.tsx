import { PublicLayout } from "@/components/layout/PublicLayout";
import { LegalDocumentPage } from "@/components/basalim/LegalDocumentPage";
import { DISCLAIMER, LEGAL_UPDATED } from "@/lib/basalim/legal-copy";

export default async function LegalDisclaimerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <LegalDocumentPage
        locale={locale}
        titleEn={DISCLAIMER.titleEn}
        titleAr={DISCLAIMER.titleAr}
        paragraphsEn={DISCLAIMER.en}
        paragraphsAr={DISCLAIMER.ar}
        updated={LEGAL_UPDATED}
      />
    </PublicLayout>
  );
}
