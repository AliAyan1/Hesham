import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AboutBasalimPage } from "@/components/basalim/AboutBasalimPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "من نحن | استشارات بصيلم" : "About Us | Basalim Consulting";
  const description = isAr
    ? "تعرف على استشارات بصيلم — رؤيتنا ومهمتنا وفريقنا المتخصص في دعم نمو الأعمال في المملكة العربية السعودية."
    : "Learn about Basalim Consulting — our vision, mission, and expert team driving business growth in Saudi Arabia.";
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>
      <AboutBasalimPage locale={locale} />
    </PublicLayout>
  );
}
