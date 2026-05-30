import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserRole } from "@/types";
import { requireMentorPage } from "@/lib/mentor/mentor-page";
import MentorSessionsClient from "./MentorSessionsClient";

export default async function MentorSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { breadcrumbs } = await requireMentorPage(locale, "sessions");

  return (
    <DashboardLayout locale={locale} role={UserRole.MENTOR} breadcrumbs={breadcrumbs}>
      <MentorSessionsClient />
    </DashboardLayout>
  );
}
