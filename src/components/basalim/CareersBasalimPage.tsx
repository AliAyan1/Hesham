import { Link } from "@/i18n/navigation";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimCta } from "@/components/basalim/BasalimCta";

const CULTURE = [
  { en: "Growth focused", ar: "التطوير المستمر" },
  { en: "Real impact", ar: "الأثر الحقيقي" },
  { en: "Collaborative team", ar: "فريق متعاون" },
];

const JOBS = [
  {
    titleEn: "HR Consultant",
    titleAr: "مستشار موارد بشرية",
    locationEn: "Riyadh",
    locationAr: "الرياض",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
  {
    titleEn: "Learning & Development Specialist",
    titleAr: "متخصص تعلم وتطوير",
    locationEn: "Jordan",
    locationAr: "الأردن",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
  {
    titleEn: "Talent Acquisition Specialist",
    titleAr: "متخصص استقطاب المواهب",
    locationEn: "Riyadh",
    locationAr: "الرياض",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
  {
    titleEn: "Operations Coordinator",
    titleAr: "منسق عمليات",
    locationEn: "Remote",
    locationAr: "عن بُعد",
    typeEn: "Full-time",
    typeAr: "دوام كامل",
  },
];

type Props = { locale: string; careersEmail: string };

export function CareersBasalimPage({ locale, careersEmail }: Props) {
  const isAr = locale === "ar";
  const showJobs = JOBS.length > 0;

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn="Join a Team That Builds People."
        titleAr="انضم إلى فريقنا — انضم إلى فريق يبني الناس"
        subtitleEn="We're always looking for passionate professionals who want to build organizations and develop people."
        subtitleAr="نبحث دائماً عن المحترفين الشغوفين الذين يريدون بناء المنظمات وتطوير الناس"
      />

      <section className="bg-white px-4 py-16 md:px-6">
        <h2 className="mx-auto max-w-7xl text-2xl font-bold text-[#0D1F2D]">
          {isAr ? "الحياة في باسالم" : "Life at Basalim"}
        </h2>
        <div className="mx-auto mt-8 grid max-w-7xl gap-6 md:grid-cols-3">
          {CULTURE.map((c) => (
            <div key={c.en} className="rounded-xl bg-[#F5F3EE] p-8 text-center font-semibold text-[#0D1F2D]">
              {isAr ? c.ar : c.en}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F5F3EE] px-4 py-16 md:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-[#0D1F2D]">
            {isAr ? "الوظائف المتاحة" : "Open Positions"}
          </h2>
          {showJobs ? (
            <ul className="mt-8 space-y-4">
              {JOBS.map((job) => (
                <li
                  key={job.titleEn}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-[#0D1F2D]">{isAr ? job.titleAr : job.titleEn}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {isAr ? job.locationAr : job.locationEn} · {isAr ? job.typeAr : job.typeEn}
                    </p>
                  </div>
                  <a
                    href={`mailto:${careersEmail}?subject=${encodeURIComponent(isAr ? job.titleAr : job.titleEn)}`}
                    className="inline-flex justify-center rounded-md bg-[#1A6B5A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#155A4A]"
                  >
                    {isAr ? "قدّم الآن" : "Apply"}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-[#6B7280]">
              {isAr ? "لا توجد وظائف شاغرة حالياً. أرسل سيرتك الذاتية إلى:" : "No open positions right now. Send your CV to:"}{" "}
              <a href={`mailto:${careersEmail}`} className="font-semibold text-[#1A6B5A]">
                {careersEmail}
              </a>
            </p>
          )}
          <Link
            href="/contact"
            className="mt-8 inline-block text-sm font-semibold text-[#1A6B5A] hover:underline"
          >
            {isAr ? "عرض جميع الفرص ←" : "View All Opportunities →"}
          </Link>
        </div>
      </section>

      <BasalimCta
        locale={locale}
        titleEn="Grow Your Career. Create a Brighter Tomorrow."
        titleAr="طوّر مسيرتك. اصنع غداً أكثر إشراقاً"
        buttonEn="Get in Touch"
        buttonAr="تواصل معنا"
      />
    </>
  );
}
