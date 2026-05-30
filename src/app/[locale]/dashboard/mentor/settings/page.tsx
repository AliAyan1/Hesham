import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserRole } from "@/types";
import { requireMentorPage } from "@/lib/mentor/mentor-page";
import { getTranslations } from "next-intl/server";

export default async function MentorSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { breadcrumbs } = await requireMentorPage(locale, "settings");
  const t = await getTranslations({ locale, namespace: "mentor" });

  return (
    <DashboardLayout locale={locale} role={UserRole.MENTOR} breadcrumbs={breadcrumbs}>
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("settings")}</h1>
      <p className="mt-4 text-sm text-[#6B7280]">{t("settingsHint")}</p>
    </DashboardLayout>
  );
}
