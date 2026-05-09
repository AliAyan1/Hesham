import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { CandidateViewClient } from "./CandidateViewClient";

export const dynamic = "force-dynamic";

export default async function EmployerCandidateDetailPage({
  params,
}: {
  params: Promise<{ locale: string; applicationId: string }>;
}) {
  const { locale, applicationId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const ts = await getTranslations({ locale, namespace: "sidebar" });
  const tec = await getTranslations({ locale, namespace: "employerCandidates" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: ts("employer.candidates"), href: "/dashboard/employer/candidates" },
    { label: tec("detailBreadcrumb"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <CandidateViewClient applicationId={applicationId} />
    </DashboardLayout>
  );
}
