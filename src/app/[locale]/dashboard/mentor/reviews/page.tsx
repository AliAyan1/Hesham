import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserRole } from "@/types";
import { requireMentorPage } from "@/lib/mentor/mentor-page";
import MentorReviewsClient from "./MentorReviewsClient";

export default async function MentorReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { breadcrumbs } = await requireMentorPage(locale, "reviews");

  return (
    <DashboardLayout locale={locale} role={UserRole.MENTOR} breadcrumbs={breadcrumbs}>
      <MentorReviewsClient />
    </DashboardLayout>
  );
}
