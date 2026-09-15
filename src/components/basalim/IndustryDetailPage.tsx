import { Link } from "@/i18n/navigation";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimCta } from "@/components/basalim/BasalimCta";
import type { IndustryDetail } from "@/lib/basalim/industries-data";

type Props = { locale: string; industry: IndustryDetail };

export function IndustryDetailPage({ locale, industry }: Props) {
  const isAr = locale === "ar";
  const challenges = isAr ? industry.challengesAr : industry.challengesEn;
  const help = isAr ? industry.helpAr : industry.helpEn;
  const services = isAr ? industry.servicesAr : industry.servicesEn;

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn={industry.titleEn}
        titleAr={industry.titleAr}
        subtitleEn={industry.descEn}
        subtitleAr={industry.descAr}
        heightClass="min-h-[45vh]"
      />

      <section className="bg-white px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-[#0D1F2D]">
              {isAr ? "التحديات الرئيسية" : "Key Challenges"}
            </h2>
            <ul className="mt-6 space-y-3 text-[#6B7280]">
              {challenges.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="text-[#1A6B5A]">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0D1F2D]">
              {isAr ? "كيف نساعد" : "How We Help"}
            </h2>
            <ul className="mt-6 space-y-3 text-[#6B7280]">
              {help.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-[#1A6B5A]">•</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F3EE] px-4 py-14 md:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-bold text-[#0D1F2D]">
            {isAr ? "خدمات ذات صلة" : "Relevant Services"}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {services.map((s) => (
              <li
                key={s}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1A6B5A] shadow-sm"
              >
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-xl border border-[#1A6B5A]/20 bg-white p-6 text-[#374151]">
            {isAr ? industry.caseAr : industry.caseEn}
          </p>
          <Link
            href="/services"
            className="mt-6 inline-block text-sm font-semibold text-[#1A6B5A] hover:underline"
          >
            {isAr ? "استكشف جميع الخدمات ←" : "Explore all services →"}
          </Link>
        </div>
      </section>

      <BasalimCta
        locale={locale}
        titleEn="Ready to discuss your sector?"
        titleAr="مستعد لمناقشة قطاعك؟"
        buttonEn="Book a Consultation"
        buttonAr="احجز استشارة"
      />
    </>
  );
}
