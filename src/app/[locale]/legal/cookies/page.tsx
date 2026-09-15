import { PublicLayout } from "@/components/layout/PublicLayout";
import { LegalDocumentPage } from "@/components/basalim/LegalDocumentPage";
import { COOKIES, LEGAL_UPDATED } from "@/lib/basalim/legal-copy";

export default async function LegalCookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <LegalDocumentPage
        locale={locale}
        titleEn={COOKIES.titleEn}
        titleAr={COOKIES.titleAr}
        paragraphsEn={COOKIES.en}
        paragraphsAr={COOKIES.ar}
        updated={LEGAL_UPDATED}
      />
    </PublicLayout>
  );
}
