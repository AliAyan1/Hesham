import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPrisma } from "@/lib/db";
import { UserRole, type SubscriptionTier } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { EmployerJobsManager } from "./EmployerJobsManager";

export const dynamic = "force-dynamic";

export default async function EmployerJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const ts = await getTranslations({ locale, namespace: "sidebar" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: ts("employer.jobs"), href: null },
  ];

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <EmployerJobsManager tier={tier} />
    </DashboardLayout>
  );
}
