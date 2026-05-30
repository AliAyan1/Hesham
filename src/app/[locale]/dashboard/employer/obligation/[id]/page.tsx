import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import ObligationClient from "./ObligationClient";

export default async function ObligationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: "Obligation", href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <ObligationClient />
    </DashboardLayout>
  );
}
