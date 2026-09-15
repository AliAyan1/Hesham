import { QudratakInnerHero } from "@/components/qudratak/QudratakInnerHero";
import { QudratakPartnershipForm } from "@/components/qudratak/QudratakPartnershipForm";

type Props = { locale: string };

const OPTIONS = [
  {
    titleEn: "Sponsor a Talent Cohort",
    titleAr: "راعِ مجموعة من المواهب السعودية",
    descEn:
      "Sponsor 100+ Saudi talents through assessment → training → mentoring → career placement.",
    descAr: "رعاية مسار متكامل: تقييم، تدريب، إرشاد، ثم توظيف.",
  },
  {
    titleEn: "Access Pre-Assessed Talent",
    titleAr: "وصل إلى مواهب جاهزة للعمل",
    descEn: "Hire from a pool of assessed, development-ready candidates.",
    descAr: "توظيف من مجموعة مرشحين مُقيّمين وجاهزين للانطلاق.",
  },
  {
    titleEn: "CSR & Social Impact Programs",
    titleAr: "اصنع أثراً اجتماعياً ملموساً",
    descEn: "Create measurable social impact through structured talent development.",
    descAr: "برامج تطوير مواهب منظمة لأثر اجتماعي قابل للقياس.",
  },
];

export function QudratakPartnershipsPage({ locale }: Props) {
  const isAr = locale === "ar";

  return (
    <>
      <QudratakInnerHero
        locale={locale}
        titleEn="Corporate Partnerships."
        titleAr="شراكات مؤسسية"
        subtitleEn="Partner with Qudratak to develop Saudi talent, create measurable impact and build your future talent pipeline."
        subtitleAr="شارك قدرتك لتطوير الكوادر السعودية وبناء خطوط المواهب المستقبلية"
      />

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-3 md:px-6">
        {OPTIONS.map((o) => (
          <div key={o.titleEn} className="rounded-xl border border-gray-100 bg-[#F5F3EE] p-6">
            <h3 className="font-bold text-[#0D1F2D]">{isAr ? o.titleAr : o.titleEn}</h3>
            <p className="mt-3 text-sm text-[#6B7280]">{isAr ? o.descAr : o.descEn}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-xl px-4 pb-20 md:px-6">
        <h2 className="mb-6 text-center text-xl font-bold">
          {isAr ? "تواصل مع فريق الشراكات" : "Contact our partnerships team"}
        </h2>
        <QudratakPartnershipForm locale={locale} />
      </section>
    </>
  );
}
