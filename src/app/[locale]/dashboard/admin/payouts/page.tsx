import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import AdminPayoutsClient from "./AdminPayoutsClient";

export default async function AdminPayoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.ADMIN) redirect(`/${locale}/dashboard`);

  const t = await getTranslations({ locale, namespace: "session" });
  const tb = await getTranslations({ locale, namespace: "breadcrumb" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/admin" },
    { label: t("adminPayouts"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.ADMIN} breadcrumbs={breadcrumbs}>
      <Card title={t("adminPayouts")}>
        <AdminPayoutsClient />
      </Card>
    </DashboardLayout>
  );
}
