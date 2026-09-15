import { Check } from "lucide-react";
import { HeshamFounderPhoto } from "@/components/basalim/HeshamFounderPhoto";
import { BasalimLinkedInLink } from "@/components/layout/BasalimLinkedInLink";
import { Link } from "@/i18n/navigation";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimStatsRow } from "@/components/basalim/BasalimStatsRow";
import { BasalimCta } from "@/components/basalim/BasalimCta";

type AboutBasalimPageProps = { locale: string };

export function AboutBasalimPage({ locale }: AboutBasalimPageProps) {
  const isAr = locale === "ar";

  const values = [
    { en: "Integrity", ar: "النزاهة" },
    { en: "Excellence", ar: "التميز" },
    { en: "Partnership", ar: "الشراكة" },
    { en: "Impact", ar: "الأثر" },
    { en: "People", ar: "الإنسان" },
  ];

  const whyPoints = [
    { en: "Saudi-rooted expertise", ar: "خبرة سعودية الجذور" },
    { en: "International standards", ar: "معايير دولية" },
    { en: "End-to-end solutions", ar: "حلول متكاملة" },
    { en: "Long-term partnerships", ar: "شراكات طويلة الأمد" },
    { en: "Measurable outcomes", ar: "نتائج قابلة للقياس" },
  ];

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn={"More People.\nCreate Brighter Tomorrows."}
        titleAr={"من نحن — شركاؤك في بناء\nمستقبل الفرص"}
        subtitleEn="Basalim Consulting is a Saudi-based HR consulting firm. We help businesses grow by building the people capability, culture and talent that power sustainable growth."
        subtitleAr="باسالم كونسلتينج شركة استشارية متخصصة في بناء مستقبل الفرص والمنظمات"
      />

      <section className="bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-[#0D1F2D]">{isAr ? "من نحن" : "Who We Are"}</h2>
            <p className="mt-6 text-lg leading-relaxed text-[#6B7280]">
              {isAr
                ? "نحن شركة استشارية سعودية في مجال الموارد البشرية. نساعد الشركات على بناء قدرات الأفراد وتطوير ثقافات عالية الأداء ودفع النمو المستدام."
                : "Basalim Consulting is a Saudi HR consulting firm. We help businesses build the people capability, cross high-performing cultures, and drive sustainable growth."}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F5F3EE] p-8">
            <HeshamFounderPhoto locale={locale} className="aspect-[3/4] w-full max-w-sm mx-auto" />
            <blockquote className="mt-6 text-lg italic text-[#0D1F2D]">
              {isAr
                ? "عندما يكسب الإنسان، تكسب المنظمات والمجتمعات."
                : "When people grow, organizations and communities move forward."}
            </blockquote>
            <p className="mt-2 font-semibold text-[#1A6B5A]">Hesham Basalim</p>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F3EE] px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#1A6B5A]">{isAr ? "الرؤية" : "Vision"}</h3>
            <p className="mt-3 text-xl font-semibold text-[#0D1F2D]">
              {isAr ? "غدٍ أكثر إنسانية." : "A More Human Tomorrow."}
            </p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#1A6B5A]">{isAr ? "الرسالة" : "Mission"}</h3>
            <p className="mt-3 text-[#0D1F2D]">
              {isAr
                ? "شريكك في بناء مستقبل الفرص والمنظمات."
                : "To be the trusted partner for organizations building stronger people systems."}
            </p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-sm md:col-span-1">
            <h3 className="text-lg font-bold text-[#1A6B5A]">{isAr ? "القيم" : "Values"}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {values.map((v) => (
                <li
                  key={v.en}
                  className="rounded-full bg-[#1A6B5A]/10 px-3 py-1 text-sm font-medium text-[#1A6B5A]"
                >
                  {isAr ? v.ar : v.en}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <BasalimStatsRow locale={locale} />

      <section className="border-y border-gray-100 bg-white px-4 py-12 text-center md:px-6">
        <p className="text-lg font-semibold text-[#0D1F2D]">
          {isAr ? "يثق بنا قادة المنظمات" : "Trusted by ambitious organizations"}
        </p>
        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-8 opacity-70 grayscale md:gap-10">
          {["AMARA", "TIME", "CLINIQUE LA PRAIRIE", "wirgan"].map((name) => (
            <span key={name} className="text-xs font-bold tracking-wide text-gray-500 md:text-sm">
              {name}
            </span>
          ))}
        </div>
        <Link
          href="/clients"
          className="mt-8 inline-flex text-sm font-semibold text-[#1A6B5A] hover:underline"
        >
          {isAr ? "اقرأ قصص النجاح ←" : "Read success stories →"}
        </Link>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-2">
          <HeshamFounderPhoto
            locale={locale}
            className="mx-auto aspect-[3/4] w-full max-w-sm lg:max-h-[520px]"
            priority
          />
          <div>
            <h2 className="text-3xl font-bold text-[#0D1F2D]">Hesham Basalim</h2>
            <p className="mt-2 text-[#1A6B5A]">
              {isAr ? "المؤسس والمستشار الإداري" : "Founder & Managing Consultant"}
            </p>
            <p className="mt-6 leading-relaxed text-[#6B7280]">
              {isAr
                ? "يقود هشام باسالم باسالم كونسلتينج برؤية تضع الإنسان في قلب كل مشروع. بخبرة تمتد في استشارات الموارد البشرية والتطوير التنظيمي، يعمل مع المنظمات لبناء قدرات فرقها وثقافاتها بما يحقق نمواً مستداماً."
                : "Hesham Basalim leads Basalim Consulting with a belief that people are at the center of every successful organization. With deep experience in HR consulting and organizational development, he partners with clients to build capability, culture and talent systems that last."}
            </p>
            <p className="mt-6 text-lg font-medium text-[#0D1F2D]">
              {isAr
                ? "عندما يكسب الإنسان، تكسب المنظمات والمجتمعات."
                : "When people grow, organizations and communities move forward."}
            </p>
            <BasalimLinkedInLink
              className="mt-6 text-[#1A6B5A] hover:text-[#155A4A]"
              iconClassName="h-9 w-9"
              showLabel
            />
          </div>
        </div>
      </section>

      <section className="bg-[#0D1F2D] px-4 py-16 text-white md:px-6">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{isAr ? "لماذا باسالم؟" : "Why Basalim?"}</h2>
          <ul className="mx-auto mt-8 inline-flex w-full max-w-md flex-col items-start gap-4 text-start sm:w-auto">
            {whyPoints.map((p) => (
              <li key={p.en} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A84C]" aria-hidden />
                <span>{isAr ? p.ar : p.en}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BasalimCta
        locale={locale}
        titleEn="Ready to start?"
        titleAr="مستعد للبدء؟"
        buttonEn="Book a consultation"
        buttonAr="احجز استشارة"
      />
    </>
  );
}
