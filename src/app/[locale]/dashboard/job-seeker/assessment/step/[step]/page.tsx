import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { isValidStep } from "@/lib/assessment/steps";
import AssessmentStepClient from "./AssessmentStepClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default async function AssessmentStepPage({
  params,
}: {
  params: Promise<{ locale: string; step: string }>;
}) {
  const { locale, step: stepRaw } = await params;
  const stepNum = Number.parseInt(stepRaw, 10);
  if (!isValidStep(stepNum)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tDash = await getTranslations({ locale, namespace: "dashboard" });
  const tAssess = await getTranslations({ locale, namespace: "assessment" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/job-seeker" },
    { label: tDash("assessmentScore"), href: "/dashboard/job-seeker/assessment" },
    { label: tAssess(`steps.step${stepNum}.title` as "steps.step1.title"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <Suspense fallback={<LoadingSpinner size="md" label={tc("loading")} />}>
        <AssessmentStepClient stepNumber={stepNum} />
      </Suspense>
    </DashboardLayout>
  );
}
