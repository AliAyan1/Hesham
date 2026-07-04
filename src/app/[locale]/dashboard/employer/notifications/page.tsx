import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserRole } from "@/types";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NotificationsListClient } from "@/components/notifications/NotificationsListClient";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";

export default async function EmployerNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tSide = await getTranslations({ locale, namespace: "sidebar" });
  const tn = await getTranslations({ locale, namespace: "notifications" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: tSide("employer.notifications"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <h1 className="mb-6 text-2xl font-bold text-[#0D2137]">{tn("title")}</h1>
      <NotificationsListClient limit={50} />
    </DashboardLayout>
  );
}
