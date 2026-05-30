import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserRole } from "@/types";
import { requireMentorPage } from "@/lib/mentor/mentor-page";
import { getTranslations } from "next-intl/server";
import { NotificationsListClient } from "@/components/notifications/NotificationsListClient";

export default async function MentorNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { breadcrumbs } = await requireMentorPage(locale, "notifications");
  const tn = await getTranslations({ locale, namespace: "notifications" });

  return (
    <DashboardLayout locale={locale} role={UserRole.MENTOR} breadcrumbs={breadcrumbs}>
      <h1 className="mb-6 text-2xl font-bold text-[#0D2137]">{tn("title")}</h1>
      <NotificationsListClient limit={50} />
    </DashboardLayout>
  );
}
