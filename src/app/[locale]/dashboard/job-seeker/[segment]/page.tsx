import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Card } from "@/components/ui/Card";

const SEGMENTS = {
  profile: "profile",
  "cv-builder": "cv",
  jobs: "jobs",
  applications: "applications",
  assessment: "assessment",
  mentors: "mentors",
  notifications: "notifications",
} as const satisfies Record<
  string,
  | "profile"
  | "cv"
  | "jobs"
  | "applications"
  | "assessment"
  | "mentors"
  | "notifications"
>;

export default async function JobSeekerSegmentPage({
  params,
}: {
  params: Promise<{ locale: string; segment: string }>;
}) {
  const { locale, segment } = await params;

  if (!(segment in SEGMENTS)) notFound();

  const sidebarKey = SEGMENTS[segment as keyof typeof SEGMENTS];

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER)
    redirect(`/${locale}/dashboard`);

  const tSide = await getTranslations({ locale, namespace: "sidebar" });
  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const title = tSide(`jobSeeker.${sidebarKey}` as never);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/job-seeker" },
    { label: title, href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <Card title={title}>
        <p className="text-sm text-gray-600">{tc("comingSoon")}</p>
      </Card>
    </DashboardLayout>
  );
}
