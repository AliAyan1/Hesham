import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Card } from "@/components/ui/Card";

const SEGMENTS = {
  "post-job": "postJob",
  jobs: "jobs",
  candidates: "candidates",
  analytics: "analytics",
  assessments: "assessments",
  notifications: "notifications",
  settings: "settings",
} as const satisfies Record<
  string,
  "postJob" | "jobs" | "candidates" | "analytics" | "assessments" | "notifications" | "settings"
>;

export default async function EmployerSegmentPage({
  params,
}: {
  params: Promise<{ locale: string; segment: string }>;
}) {
  const { locale, segment } = await params;

  if (!(segment in SEGMENTS)) notFound();

  const sidebarKey = SEGMENTS[segment as keyof typeof SEGMENTS];

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER)
    redirect(`/${locale}/dashboard`);

  const tSide = await getTranslations({ locale, namespace: "sidebar" });
  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const title = tSide(`employer.${sidebarKey}` as never);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: title, href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <Card title={title}>
        <p className="text-sm text-gray-600">{tc("comingSoon")}</p>
      </Card>
    </DashboardLayout>
  );
}
