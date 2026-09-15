import { QudratakInnerHero } from "@/components/qudratak/QudratakInnerHero";
import { FlaskConical, Route, UsersRound } from "lucide-react";

type Props = { locale: string };

export function QudratakAboutPage({ locale }: Props) {
  const isAr = locale === "ar";

  const differentiators = [
    {
      icon: FlaskConical,
      titleEn: "Scientific approach",
      titleAr: "المنهج العلمي",
      descEn: "Evidence-based assessments and development paths.",
      descAr: "تقييمات ومسارات تطوير مبنية على منهج علمي.",
    },
    {
      icon: Route,
      titleEn: "End-to-end journey",
      titleAr: "رحلة متكاملة",
      descEn: "From discovery to employment in one platform.",
      descAr: "من الاكتشاف إلى التوظيف في منصة واحدة.",
    },
    {
      icon: UsersRound,
      titleEn: "Real connections",
      titleAr: "توصيلات حقيقية",
      descEn: "Mentors and employers who invest in your growth.",
      descAr: "مرشدون وأصحاب عمل يستثمرون في نموك.",
    },
  ];

  return (
    <>
      <QudratakInnerHero
        locale={locale}
        titleEn="From an Idea to Real Opportunities."
        titleAr="من فكرة... إلى فرص حقيقية"
        subtitleEn="Qudratak is an initiative by Basalim Consulting to support Saudi youth and early-career professionals in discovering their potential, developing their skills and accessing real opportunities."
        subtitleAr="قدرتك مبادرة أطلقتها باسالم كونسلتينج لدعم الشباب السعودي والمهنيين في مرحلة البداية لاكتشاف إمكاناتهم وتطوير مهاراتهم والوصول إلى فرص حقيقية"
      />

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <div className="rounded-2xl bg-[#F5F3EE] p-8 md:p-10">
          <h2 className="text-xl font-bold text-[#1A6B5A]">{isAr ? "الرسالة" : "Mission"}</h2>
          <p className="mt-4 text-lg leading-relaxed text-[#0D1F2D]">
            {isAr
              ? "نؤمن أن كل شاب وشابة لديهم إمكانات تستحق الاكتشاف والتطوير"
              : "We believe every young person has potential worth discovering."}
          </p>
        </div>

        <h2 className="mt-16 text-center text-2xl font-bold text-[#0D1F2D]">
          {isAr ? "ما الذي يميز قدرتك؟" : "What makes Qudratak different?"}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {differentiators.map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.titleEn} className="rounded-xl border border-gray-100 p-6 shadow-sm">
                <Icon className="h-8 w-8 text-[#1A6B5A]" aria-hidden />
                <h3 className="mt-4 font-bold">{isAr ? d.titleAr : d.titleEn}</h3>
                <p className="mt-2 text-sm text-[#6B7280]">{isAr ? d.descAr : d.descEn}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
