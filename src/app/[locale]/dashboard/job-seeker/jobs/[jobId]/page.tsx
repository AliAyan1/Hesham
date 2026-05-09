import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { JobDetailClient } from "./JobDetailClient";

export const dynamic = "force-dynamic";

export default async function JobSeekerJobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale, jobId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tSide = await getTranslations({ locale, namespace: "sidebar" });
  const tJobs = await getTranslations({ locale, namespace: "jobs" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/job-seeker" },
    { label: tSide("jobSeeker.jobs"), href: "/dashboard/job-seeker/jobs" },
    { label: tJobs("details"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <JobDetailClient jobId={jobId} />
    </DashboardLayout>
  );
}
