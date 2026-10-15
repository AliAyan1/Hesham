import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BasalimHomePage } from "@/components/basalim/BasalimHomePage";
import { createBasalimHomeMetadata } from "@/lib/basalim-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createBasalimHomeMetadata(locale);
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>
      <BasalimHomePage locale={locale} />
    </PublicLayout>
  );
}
