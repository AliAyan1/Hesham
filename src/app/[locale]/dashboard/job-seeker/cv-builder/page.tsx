import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPrisma } from "@/lib/db";
import { UserRole, type SubscriptionTier } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { CvBuilderClient } from "./CvBuilderClient";
import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";

export const dynamic = "force-dynamic";

export default async function CvBuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tSide = await getTranslations({ locale, namespace: "sidebar" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/job-seeker" },
    { label: tSide("jobSeeker.cv"), href: null },
  ];

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionTier: true,
      cv: {
        select: {
          fullName: true,
          fullNameAr: true,
          professionalTitle: true,
          professionalTitleAr: true,
          email: true,
          phone: true,
          location: true,
          linkedinUrl: true,
          portfolioUrl: true,
          summary: true,
          experience: true,
          education: true,
          skills: true,
        },
      },
    },
  });

  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  const cv = user?.cv;

  function safeArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  const initial = cv
    ? {
        fullName: cv.fullName ?? "",
        fullNameAr: cv.fullNameAr ?? "",
        title: cv.professionalTitle ?? "",
        email: cv.email ?? "",
        phone: cv.phone ?? "",
        location: cv.location ?? "",
        linkedinUrl: cv.linkedinUrl ?? "",
        portfolioUrl: cv.portfolioUrl ?? "",
        summary: cv.summary ?? "",
        experience: safeArray(cv.experience).map((row) => {
          const r = row as Record<string, unknown>;
          return {
            title: typeof r.title === "string" ? r.title : "",
            company: typeof r.company === "string" ? r.company : "",
            description: mergeExperienceDescriptionFromRecord(r),
          };
        }),
        education: safeArray(cv.education).map((row) => {
          const r = row as Record<string, unknown>;
          return {
            degree: typeof r.degree === "string" ? r.degree : "",
            institution: typeof r.institution === "string" ? r.institution : "",
          };
        }),
        skills: safeArray(cv.skills)
          .map((row) => {
            if (typeof row === "string") return row;
            const r = row as Record<string, unknown>;
            return typeof r.name === "string" ? r.name : "";
          })
          .filter(Boolean),
      }
    : null;

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <CvBuilderClient tier={tier} initial={initial} />
    </DashboardLayout>
  );
}

