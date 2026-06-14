import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { PaymentsHistoryClient } from "@/components/payments/PaymentsHistoryClient";

export default async function EmployerPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const t = await getTranslations({ locale, namespace: "payments" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: t("historyTitle"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <PaymentsHistoryClient />
    </DashboardLayout>
  );
}
