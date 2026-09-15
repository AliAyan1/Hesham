import { getTranslations } from "next-intl/server";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BasalimContactPage } from "@/components/basalim/BasalimContactPage";
import { getContent } from "@/lib/cms";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contact" });
  const content = await getContent(locale);

  return (
    <PublicLayout locale={locale}>
      <BasalimContactPage
        locale={locale}
        email={content["contact_email"] ?? t("emailValue")}
        addressEn={content["contact_address"] ?? t("locationValue")}
        addressAr={content["contact_address"] ?? t("locationValue")}
        hoursEn={content["contact_hours"] ?? t("responseValue")}
        hoursAr={content["contact_hours"] ?? t("responseValue")}
      />
    </PublicLayout>
  );
}
