import { PricingCardsSection } from "@/components/landing/PricingCardsSection";
import { PricingComparisonTable } from "@/components/pricing/PricingComparisonTable";
import { PricingFaqAccordion } from "@/components/pricing/PricingFaqAccordion";
import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
  /** Full pricing page vs section on Qudratak home */
  variant?: "section" | "page";
};

/** Live Qudrahtech plans (CMS/settings) — same cards as platform `/pricing`. */
export async function QudratakPlatformPricingSection({
  locale,
  variant = "section",
}: Props) {
  const isAr = locale === "ar";
  const t = await getTranslations({ locale, namespace: "pages.pricing" });
  const isPage = variant === "page";

  return (
    <section
      id="pricing"
      className="scroll-mt-24 bg-[#F8FAFC] px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className={isPage ? "text-center" : "mb-10 text-center"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1A6B5A]">
            {isAr ? "منصة قدرتك" : "Qudrahtech platform"}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#0D1F2D] md:text-4xl">
            {isAr ? "اختر الباقة المناسبة لك" : "Choose the Right Plan for You"}
          </h2>
          {!isPage ? (
            <p className="mx-auto mt-3 max-w-2xl text-[#6B7280]">
              {isAr
                ? "سجّل مجاناً أو ارتقِ إلى برو/بريميوم — نفس خطط المنصة الرسمية."
                : "Start free or upgrade to Pro/Premium — the same plans as the live platform."}
            </p>
          ) : (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6B7280]">{t("heroSubtitle")}</p>
          )}
        </div>

        <PricingCardsSection locale={locale} showHeader={false} className="mt-10" />

        {isPage ? (
          <>
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
          </>
        ) : null}
      </div>
    </section>
  );
}
