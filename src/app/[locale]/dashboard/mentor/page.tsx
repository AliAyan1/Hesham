import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import MentorDashboardClient from "./MentorDashboardClient";

export default async function MentorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.MENTOR) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tm = await getTranslations({ locale, namespace: "mentor" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tm("dashboard"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.MENTOR} breadcrumbs={breadcrumbs}>
      <MentorDashboardClient />
    </DashboardLayout>
  );
}
