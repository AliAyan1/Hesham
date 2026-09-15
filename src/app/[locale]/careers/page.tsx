import { getTranslations } from "next-intl/server";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CareersBasalimPage } from "@/components/basalim/CareersBasalimPage";
import { getContent } from "@/lib/cms";

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tContact = await getTranslations({ locale, namespace: "pages.contact" });
  const content = await getContent(locale);
  const careersEmail = content["contact_email"] ?? tContact("emailValue");

  return (
    <PublicLayout locale={locale}>
      <CareersBasalimPage locale={locale} careersEmail={careersEmail} />
    </PublicLayout>
  );
}
