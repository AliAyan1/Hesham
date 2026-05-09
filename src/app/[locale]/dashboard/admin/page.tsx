import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.ADMIN) {
    redirect(`/${locale}/dashboard`);
  }

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: null },
  ];

  const userName = session.user.name ?? session.user.email ?? "";

  return (
    <DashboardLayout locale={locale} role={UserRole.ADMIN} breadcrumbs={breadcrumbs}>
      <AdminDashboardClient userName={userName} />
    </DashboardLayout>
  );
}
