import { MapPin } from "lucide-react";
import { QudratakInnerHero } from "@/components/qudratak/QudratakInnerHero";
import { PlatformButton } from "@/components/qudratak/PlatformCta";
import { QUDRATAK_SAMPLE_JOBS } from "@/lib/basalim/qudratak-data";
import { QudrahtechJobsUrl } from "@/lib/basalim-public";

type Props = { locale: string };

export function QudratakOpportunitiesPage({ locale }: Props) {
  const isAr = locale === "ar";
  const jobsUrl = QudrahtechJobsUrl(locale);

  return (
    <>
      <QudratakInnerHero
        locale={locale}
        titleEn="Opportunities That Match Your Ambition."
        titleAr="فرص تناسب طموحك"
        subtitleEn="Discover roles that fit your profile and assessment."
        subtitleAr="اكتشف الوظائف المناسبة لك بناءً على ملفك الشخصي وتقييمك"
      />

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-2 md:px-6">
        {QUDRATAK_SAMPLE_JOBS.map((job) => (
          <article
            key={job.titleEn}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-[#0D1F2D]">
              {isAr ? job.titleAr : job.titleEn}
            </h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#6B7280]">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {isAr ? job.locationAr : job.locationEn}
            </p>
            <p className="mt-1 text-sm text-[#1A6B5A]">{isAr ? job.typeAr : job.typeEn}</p>
            <PlatformButton href={jobsUrl} variant="gold" className="mt-6 text-sm">
              {isAr ? "عرض الفرصة ←" : "View Opportunity →"}
            </PlatformButton>
          </article>
        ))}
      </section>

      <div className="pb-16 text-center">
        <PlatformButton href={jobsUrl} variant="dark" className="px-8">
          {isAr ? "تصفح جميع الفرص ←" : "Browse All Opportunities →"}
        </PlatformButton>
      </div>
    </>
  );
}
