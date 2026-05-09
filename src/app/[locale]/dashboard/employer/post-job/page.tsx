import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPrisma } from "@/lib/db";
import { hasAccess } from "@/lib/subscription";
import { UserRole, type SubscriptionTier } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { PostJobForm } from "./PostJobForm";

export const dynamic = "force-dynamic";

export default async function EmployerPostJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { locale } = await params;
  const qs = await searchParams;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.EMPLOYER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const ts = await getTranslations({ locale, namespace: "sidebar" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/employer" },
    { label: ts("employer.postJob"), href: null },
  ];

  const rawStep = typeof qs.step === "string" ? Number.parseInt(qs.step, 10) : NaN;
  const initialStep =
    Number.isFinite(rawStep) && rawStep >= 1 && rawStep <= 4 ? (rawStep as 1 | 2 | 3 | 4) : undefined;

  const prisma = getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (row?.subscriptionTier ?? "FREE") as SubscriptionTier;
  const canAiJobDescription = hasAccess(tier, "ai_job_description");

  return (
    <DashboardLayout locale={locale} role={UserRole.EMPLOYER} breadcrumbs={breadcrumbs}>
      <PostJobForm canAiJobDescription={canAiJobDescription} initialStep={initialStep} />
    </DashboardLayout>
  );
}
