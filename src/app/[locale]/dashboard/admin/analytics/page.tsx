import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.ADMIN) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/admin" },
    { label: "Analytics", href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.ADMIN} breadcrumbs={breadcrumbs}>
      <AdminAnalyticsClient />
    </DashboardLayout>
  );
}
