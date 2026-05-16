import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPrisma } from "@/lib/db";
import { hasAccess } from "@/lib/subscription";
import { UserRole, type SubscriptionTier } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import EmployerDashboardClient from "./EmployerDashboardClient";
import { resolveEmployerDbUserForDashboard } from "@/lib/resolve-session-user";

export default async function EmployerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) {
    redirect(`/${locale}/dashboard`);
  }

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: null },
  ];

  const userName = session.user.name ?? session.user.email ?? "";

  const resolved = await resolveEmployerDbUserForDashboard(session);
  if (!resolved) redirect(`/${locale}/auth/login`);

  const prisma = getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: resolved.id },
    select: { subscriptionTier: true },
  });
  const subscriptionTier = (row?.subscriptionTier ?? "FREE") as SubscriptionTier;
  const canAiJobDescription = hasAccess(subscriptionTier, "ai_job_description");

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <EmployerDashboardClient
        userName={userName}
        subscriptionTier={subscriptionTier}
        canAiJobDescription={canAiJobDescription}
      />
    </DashboardLayout>
  );
}
