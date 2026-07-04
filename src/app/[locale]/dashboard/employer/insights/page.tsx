import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import EmployerInsightsClient from "./EmployerInsightsClient";

export const dynamic = "force-dynamic";

export default async function EmployerInsightsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const ts = await getTranslations({ locale, namespace: "sidebar" });
  const t = await getTranslations({ locale, namespace: "employerInsights" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: ts("employer.insights"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <EmployerInsightsClient title={t("title")} />
    </DashboardLayout>
  );
}
