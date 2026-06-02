import { getTranslations } from "next-intl/server";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { PricingCardsSection } from "@/components/landing/PricingCardsSection";
import { PricingComparisonTable } from "@/components/pricing/PricingComparisonTable";
import { PricingFaqAccordion } from "@/components/pricing/PricingFaqAccordion";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.pricing" });
  const isRTL = locale === "ar" || locale === "ur";

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} guestOnly />

      <section className="bg-[#F8FAFC] px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#6B7280]">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <PricingCardsSection locale={locale} showHeader={false} />

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0D2137]">{t("comparisonTitle")}</h2>
          <div className="mt-6">
            <PricingComparisonTable locale={locale} />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#0D2137]">{t("faqTitle")}</h2>
          <div className="mt-6">
            <PricingFaqAccordion />
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
