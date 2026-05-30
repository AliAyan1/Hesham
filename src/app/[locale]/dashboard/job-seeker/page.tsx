import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import JobSeekerDashboardClient from "./JobSeekerDashboardClient";
import { resolveJobSeekerDbUserForUpload } from "@/lib/resolve-session-user";

export default async function JobSeekerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER) {
    redirect(`/${locale}/dashboard`);
  }
  if (!session.user.onboardingComplete) {
    redirect(`/${locale}/onboarding`);
  }

  const resolved = await resolveJobSeekerDbUserForUpload(session);
  if (!resolved) redirect(`/${locale}/auth/login`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: null },
  ];

  const userName = session.user.name ?? session.user.email ?? "";

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <JobSeekerDashboardClient userName={userName} />
    </DashboardLayout>
  );
}
