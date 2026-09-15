import { Link } from "@/i18n/navigation";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimContactForm } from "@/components/basalim/BasalimContactForm";
import { BasalimLinkedInLink } from "@/components/layout/BasalimLinkedInLink";

type Props = {
  locale: string;
  email: string;
  addressEn: string;
  addressAr: string;
  hoursEn: string;
  hoursAr: string;
};

const CONSULT_CARDS = [
  { en: "Recruitment", ar: "التوظيف", href: "/services/talent-acquisition" },
  { en: "Organization Development", ar: "التطوير التنظيمي", href: "/services/organizational-development" },
  { en: "Training & Leadership", ar: "التدريب والقيادة", href: "/services/learning-development" },
  { en: "HR Advisory", ar: "الاستشارات", href: "/services/hr-advisory" },
];

export function BasalimContactPage({
  locale,
  email,
  addressEn,
  addressAr,
  hoursEn,
  hoursAr,
}: Props) {
  const isAr = locale === "ar";

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn={"Let's Build\nWhat's Next. Together."}
        titleAr={"تواصل معنا —\nنحن هنا لدعمك"}
        subtitleEn="We'd love to hear from you"
        subtitleAr="يسعدنا التواصل معك"
        heightClass="min-h-[40vh]"
      />

      <section className="bg-[#F5F3EE] px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <aside className="rounded-2xl bg-[#0D1F2D] p-10 text-white">
            <h2 className="text-xl font-bold">{isAr ? "تواصل معنا" : "Get in touch"}</h2>
            <ul className="mt-8 space-y-6 text-sm">
              <li>
                <p className="font-semibold">{isAr ? "الموقع" : "Location"}</p>
                <p className="mt-1 text-white/75">{isAr ? addressAr : addressEn}</p>
              </li>
              <li>
                <p className="font-semibold">{isAr ? "البريد الإلكتروني" : "Email"}</p>
                <a href={`mailto:${email}`} className="mt-1 block text-[#C9A84C] hover:underline">
                  {email}
                </a>
              </li>
              <li>
                <p className="font-semibold">{isAr ? "وقت الاستجابة" : "Response time"}</p>
                <p className="mt-1 text-white/75">
                  {isAr ? "نرد خلال 24 ساعة" : "We respond within 24 hours"}
                </p>
                <p className="mt-1 text-white/60 text-xs">{isAr ? hoursAr : hoursEn}</p>
              </li>
            </ul>
            <div className="mt-8">
              <BasalimLinkedInLink className="text-white/70 hover:text-white" />
            </div>
          </aside>

          <BasalimContactForm locale={locale} />
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONSULT_CARDS.map((c) => (
            <Link
              key={c.en}
              href={c.href}
              className="rounded-xl border border-gray-200 bg-white p-6 text-center font-semibold text-[#0D1F2D] shadow-sm transition-shadow hover:shadow-md"
            >
              {isAr ? c.ar : c.en}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
