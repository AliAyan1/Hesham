import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { AdminMentorsClient } from "./AdminMentorsClient";

export default async function AdminMentorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.ADMIN) redirect(`/${locale}/dashboard`);

  const t = await getTranslations({ locale, namespace: "adminMentors" });
  const tb = await getTranslations({ locale, namespace: "breadcrumb" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/admin" },
    { label: t("title"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.ADMIN} breadcrumbs={breadcrumbs}>
      <Card title={t("title")}>
        <AdminMentorsClient />
      </Card>
    </DashboardLayout>
  );
}
