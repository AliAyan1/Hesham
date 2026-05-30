import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserRole } from "@/types";
import { requireMentorPage } from "@/lib/mentor/mentor-page";
import MentorEarningsClient from "./MentorEarningsClient";

export default async function MentorEarningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { breadcrumbs } = await requireMentorPage(locale, "earnings");

  return (
    <DashboardLayout locale={locale} role={UserRole.MENTOR} breadcrumbs={breadcrumbs}>
      <MentorEarningsClient />
    </DashboardLayout>
  );
}
