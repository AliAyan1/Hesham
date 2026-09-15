import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimCta } from "@/components/basalim/BasalimCta";
import { BasalimStatsRow } from "@/components/basalim/BasalimStatsRow";

const LOGOS = ["AMARA", "TIME", "CLINIQUE LA PRAIRIE", "wirgan"];

const STORIES = [
  {
    clientEn: "Luxury Hospitality Group",
    clientAr: "مجموعة ضيافة فاخرة",
    challengeEn: "Needed to build a complete HR function for a 280-room resort pre-opening",
    challengeAr: "الحاجة لبناء وظيفة موارد بشرية كاملة لمنتجع 280 غرفة قبل الافتتاح",
    resultEn: "Full team of 280+ hired and trained within 6 months",
    resultAr: "توظيف وتدريب أكثر من 280 موظفاً خلال 6 أشهر",
  },
  {
    clientEn: "Regional F&B Company",
    clientAr: "شركة أغذية ومشروبات إقليمية",
    challengeEn: "Rapid expansion needed structured recruitment",
    challengeAr: "التوسع السريع يتطلب توظيفاً منظماً",
    resultEn: "2,000+ candidates processed, 90% retention in year one",
    resultAr: "معالجة أكثر من 2000 مرشح و90% احتفاظ في السنة الأولى",
  },
  {
    clientEn: "Saudi Tech Startup",
    clientAr: "شركة تقنية سعودية ناشئة",
    challengeEn: "No HR function existed",
    challengeAr: "لا توجد وظيفة موارد بشرية",
    resultEn: "Complete people system built in 3 months",
    resultAr: "بناء منظومة موارد بشرية كاملة خلال 3 أشهر",
  },
];

type Props = { locale: string };

export function ClientsBasalimPage({ locale }: Props) {
  const isAr = locale === "ar";

  const stats = [
    { valueEn: "2,000+", labelEn: "People hired", labelAr: "موظف تم تعيينه" },
    { valueEn: "90%", labelEn: "Client satisfaction", labelAr: "رضا العملاء" },
    { valueEn: "4", labelEn: "Pre-openings", labelAr: "افتتاحات مسبقة" },
    { valueEn: "10+", labelEn: "Long-term relationships", labelAr: "علاقات طويلة الأمد" },
  ];

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn="Trusted by Ambitious Organizations."
        titleAr="قصص النجاح — نفخر بشراكتنا مع منظمات طموحة"
        subtitleEn="We're proud to partner with organizations to build their teams and people capability."
        subtitleAr="نفخر بدعم المنظمات الطموحة لبناء فرقها وتطوير قدراتها"
      />

      <section className="border-b border-gray-100 bg-white py-12">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-10 px-4 opacity-70 grayscale">
          {LOGOS.map((name) => (
            <span key={name} className="text-sm font-bold tracking-wide text-gray-500">
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-[#0D1F2D] px-4 py-16 text-white md:px-6">
        <blockquote className="mx-auto max-w-3xl text-center text-xl font-medium leading-relaxed md:text-2xl">
          {isAr
            ? "قدّمت باسالم كونسلتينج دوراً محورياً في بناء فريقنا وثقافتنا منذ اليوم الأول."
            : "Basalim Consulting played a key role in building our team and culture from day one."}
        </blockquote>
        <p className="mt-6 text-center text-sm text-white/70">
          {isAr
            ? "— المدير العام، منتجع فاخر، المملكة"
            : "— General Manager, Luxury Resort, KSA"}
        </p>
      </section>

      <BasalimStatsRow locale={locale} stats={stats} />

      <section className="bg-white px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          {STORIES.map((s) => (
            <article key={s.clientEn} className="rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#1A6B5A]">{isAr ? s.clientAr : s.clientEn}</h3>
              <p className="mt-4 text-sm font-semibold text-[#0D1F2D]">
                {isAr ? "التحدي" : "Challenge"}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">
                {isAr ? s.challengeAr : s.challengeEn}
              </p>
              <p className="mt-4 text-sm font-semibold text-[#0D1F2D]">
                {isAr ? "النتيجة" : "Result"}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">{isAr ? s.resultAr : s.resultEn}</p>
            </article>
          ))}
        </div>
      </section>

      <BasalimCta
        locale={locale}
        titleEn="Become our next success story"
        titleAr="كن قصة نجاحنا القادمة"
        buttonEn="Book a Consultation"
        buttonAr="احجز استشارة"
      />
    </>
  );
}
