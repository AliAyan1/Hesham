import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { getPrisma } from "@/lib/db";
import { JobPublicDetailClient } from "./JobPublicDetailClient";

type Props = { params: Promise<{ locale: string; jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, jobId } = await params;
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: { title: true, titleAr: true, description: true },
  });
  if (!job) {
    const t = await getTranslations({ locale, namespace: "pages.jobs" });
    return { title: t("title") };
  }
  const useAr = locale === "ar" || locale === "ur";
  const titleBase = useAr && job.titleAr?.trim() ? job.titleAr : job.title;
  const desc = job.description.replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title: `${titleBase} | QudrahTech`,
    description: desc || undefined,
    openGraph: { title: titleBase, description: desc },
  };
}

export default async function PublicJobDetailPage({ params }: Props) {
  const { locale, jobId } = await params;
  const prisma = getPrisma();
  const exists = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: { id: true },
  });
  if (!exists) notFound();

  const isRTL = locale === "ar" || locale === "ur";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <JobPublicDetailClient />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
