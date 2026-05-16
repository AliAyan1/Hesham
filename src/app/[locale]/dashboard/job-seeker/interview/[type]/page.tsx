import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import InterviewTypeClient from "./InterviewTypeClient";

const ALLOWED = new Set(["practice", "competency", "job"]);

export default async function InterviewTypePage({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale, type } = await params;
  if (!ALLOWED.has(type)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tInt = await getTranslations({ locale, namespace: "interview" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/job-seeker" },
    { label: tInt("title"), href: "/dashboard/job-seeker/interview" },
    { label: type, href: null },
  ];

  const kind = type === "practice" ? "practice" : type === "competency" ? "competency" : "job";

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <Suspense fallback={<LoadingSpinner size="md" label={tc("loading")} />}>
        <InterviewTypeClient kind={kind} />
      </Suspense>
    </DashboardLayout>
  );
}
