import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Building2,
  Globe2,
  Handshake,
  Heart,
  Hotel,
  Search,
  BookOpen,
  Crown,
  Target,
} from "lucide-react";
import { HeshamFounderPhoto } from "@/components/basalim/HeshamFounderPhoto";
import { QudrahtechHomeSplitSection } from "@/components/basalim/QudrahtechHomeSplitSection";
import {
  qudratakMarketingHref,
  QUDRAH_PLATFORM_NAME,
  QUDRAH_PLATFORM_NAME_AR,
} from "@/lib/basalim-public";

type BasalimHomePageProps = {
  locale: string;
};

export function BasalimHomePage({ locale }: BasalimHomePageProps) {
  const isAr = locale === "ar";

  const stats = isAr
    ? [
        { n: "2,000+", l: "محترف تم تدريبه وتوظيفه" },
        { n: "100+", l: "مشروع منجز" },
        { n: "52%", l: "نسبة توظيف المواهب" },
        { n: "4", l: "مجالات خدمة رئيسية" },
      ]
    : [
        { n: "2,000+", l: "Professionals trained" },
        { n: "100+", l: "Projects delivered" },
        { n: "52%", l: "Placement rate" },
        { n: "4", l: "Service areas" },
      ];

  const services = [
    {
      icon: Building2,
      titleEn: "Organizational Development",
      titleAr: "التطوير التنظيمي",
      descEn: "Structure, roles, performance and people systems that scale.",
      descAr: "بناء الهياكل وأنظمة الأداء",
      href: "/services/organizational-development",
      featured: false,
    },
    {
      icon: Search,
      titleEn: "Talent Acquisition & Recruitment",
      titleAr: "التوظيف والاستقطاب",
      descEn: "Find and secure the right people faster.",
      descAr: "من البحث حتى التعيين الناجح",
      href: "/services/talent-acquisition",
      featured: false,
    },
    {
      icon: BookOpen,
      titleEn: "Learning & Development",
      titleAr: "التعلم والتطوير",
      descEn: "Training journeys that build real capability.",
      descAr: "برامج تطوير تبني قدرات حقيقية",
      href: "/services/learning-development",
      featured: false,
    },
    {
      icon: Crown,
      titleEn: "Leadership Development",
      titleAr: "تطوير القيادات",
      descEn: "Develop the leaders your organization needs to thrive.",
      descAr: "صناع التميز يبدأون من هنا",
      href: "/services/leadership-development",
      featured: false,
    },
    {
      icon: Hotel,
      titleEn: "Hospitality & Tourism Solutions",
      titleAr: "حلول الضيافة والسياحة",
      descEn: "Specialized people expertise for the hospitality sector.",
      descAr: "خبرة متخصصة في قطاع الضيافة",
      href: "/services/hospitality-tourism",
      featured: false,
    },
    {
      icon: Building2,
      titleEn: "Build Your People Function",
      titleAr: "بناء وظيفة الموارد البشرية",
      descEn: "Set up your HR foundation from strategy to systems.",
      descAr: "نبني وظيفة الموارد البشرية من الأساس إلى التميز",
      href: "/services/people-function",
      featured: true,
    },
  ];

  const values = [
    {
      icon: Target,
      titleEn: "Practical. Not Theoretical.",
      titleAr: "عملي. وليس نظري.",
      descEn: "We deliver solutions that work in real business environments.",
      descAr: "نقدم حلولاً تعمل في بيئات الأعمال الحقيقية",
    },
    {
      icon: Globe2,
      titleEn: "Regional. But World-Class.",
      titleAr: "إقليمي. بمستوى عالمي.",
      descEn: "Saudi-rooted with international standards and global experience.",
      descAr: "جذور سعودية بمعايير دولية",
    },
    {
      icon: Handshake,
      titleEn: "Partners. Not Vendors.",
      titleAr: "شركاء. وليس موردين.",
      descEn: "We work alongside you, not just deliver and disappear.",
      descAr: "نعمل إلى جانبك ولا نكتفي بالتسليم",
    },
    {
      icon: Heart,
      titleEn: "People First. Always.",
      titleAr: "الإنسان أولاً. دائماً.",
      descEn: "Every strategy starts and ends with the human element.",
      descAr: "كل استراتيجية تبدأ وتنتهي بالعنصر البشري",
    },
  ];

  const insights = [
    {
      catEn: "Saudi Talent",
      catAr: "المواهب السعودية",
      titleEn: "The Future of Hospitality Talent in Saudi Arabia",
      titleAr: "مستقبل مواهب الضيافة في المملكة",
      date: "June 2026",
      href: "/insights/hospitality-talent",
    },
    {
      catEn: "People & Culture",
      catAr: "الناس والثقافة",
      titleEn: "Building a People-First Culture",
      titleAr: "بناء ثقافة تضع الإنسان أولاً",
      date: "May 2026",
      href: "/insights/people-first-culture",
    },
    {
      catEn: "Leadership",
      catAr: "القيادة",
      titleEn: "What Makes Leaders in Saudi Arabia Different",
      titleAr: "ما الذي يميّز القادة في المملكة",
      date: "April 2026",
      href: "/insights/saudi-leadership",
    },
  ];

  const trusted = ["AMARA", "TIME", "CLINIQUE LA PRAIRIE", "wirgan"];

  const qudratakHref = qudratakMarketingHref();

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[100dvh] flex-col justify-center bg-gradient-to-br from-[#0D1F2D] to-[#1A3A2A] px-4 pb-28 pt-24 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">
            {isAr ? "الإنسان. المواهب. النمو." : "People. Talent. Growth."}
          </p>
          <h1 className="mt-4 max-w-3xl text-[2.75rem] font-extrabold leading-[1.05] text-white md:text-[4.5rem]">
            {isAr ? (
              <>
                نبني الإنسان
                <br />
                نصنع فرصاً أكبر
              </>
            ) : (
              <>
                People
                <br />
                Create Progress.
              </>
            )}
          </h1>
          <p className="mt-6 max-w-[540px] text-lg text-white/80">
            {isAr
              ? "استشارات في تطوير رأس المال البشري والتطوير التنظيمي لأعمال أكثر استدامة"
              : "Empowering businesses, teams and future leaders to achieve ambitious outcomes for sustainable growth."}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-[#1A6B5A] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#155A4A]"
            >
              {isAr ? "تواصل معنا" : "Book a Consultation"}
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-md border-2 border-white px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {isAr ? "استكشف خدماتنا" : "Explore Our Services"}
            </Link>
            <Link
              href={qudratakHref}
              className="inline-flex items-center gap-1 px-2 py-3.5 text-sm font-semibold text-[#C9A84C] underline-offset-4 hover:underline"
            >
              {isAr
                ? `اكتشف ${QUDRAH_PLATFORM_NAME_AR} ←`
                : `Discover ${QUDRAH_PLATFORM_NAME} →`}
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[rgba(13,31,45,0.9)]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 md:grid-cols-4 md:px-6">
            {stats.map((s) => (
              <div key={s.l} className="text-center md:text-start">
                <p className="text-[1.75rem] font-bold text-[#C9A84C]">{s.n}</p>
                <p className="mt-1 text-xs text-white/70">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-white px-4 py-20 md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1A6B5A]">
            {isAr ? "خدماتنا" : "Our Services"}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#0D1F2D] md:text-[2.625rem]">
            {isAr ? "من الاستراتيجية إلى الأثر الحقيقي" : "From Strategy to Real Impact."}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            {isAr
              ? "حلول متكاملة لبناء الفرد والمنظمات"
              : "End-to-end people, talent and organization solutions for businesses ready to grow."}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((card) => {
              const Icon = card.icon;
              const featured = card.featured;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={[
                    "group rounded-xl border p-6 transition-all duration-200",
                    featured
                      ? "border-[#0D1F2D] bg-[#0D1F2D] text-white shadow-lg"
                      : "border-gray-100 bg-white shadow-sm hover:border-l-[#1A6B5A] hover:shadow-md border-l-[3px] border-l-transparent",
                  ].join(" ")}
                >
                  <Icon
                    className={featured ? "h-8 w-8 text-[#C9A84C]" : "h-8 w-8 text-[#1A6B5A]"}
                    aria-hidden
                  />
                  <h3 className="mt-4 text-lg font-bold">
                    {isAr ? card.titleAr : card.titleEn}
                  </h3>
                  <p className={featured ? "mt-2 text-sm text-white/75" : "mt-2 text-sm text-[#6B7280]"}>
                    {isAr ? card.descAr : card.descEn}
                  </p>
                  <span
                    className={[
                      "mt-4 inline-flex items-center gap-1 text-sm font-semibold",
                      featured ? "text-[#C9A84C]" : "text-[#1A6B5A]",
                    ].join(" ")}
                  >
                    {isAr ? "اعرف المزيد" : "Learn more"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hesham message */}
      <section className="bg-[#F5F3EE] px-4 py-20 md:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[45%_55%]">
          <HeshamFounderPhoto
            locale={locale}
            className="aspect-[3/4] w-full max-w-md justify-self-center lg:max-h-[480px] lg:justify-self-auto"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1A6B5A]">
              {isAr ? "رسالة من" : "A message from"}
            </p>
            <h2 className="mt-2 text-[1.75rem] font-bold text-[#0D1F2D]">Hesham Basalim</h2>
            <p className="text-[#1A6B5A]">
              {isAr ? "المؤسس والمستشار الإداري" : "Founder & Managing Consultant"}
            </p>
            <p className="mt-6 text-5xl leading-none text-[#1A6B5A]/30" aria-hidden>
              &ldquo;
            </p>
            <blockquote className="text-lg leading-relaxed text-[#374151]">
              {isAr
                ? "عندما يكسب الإنسان، تكسب المنظمات والمجتمعات. كل مشروع نأخذه يُبنى على هذا الاعتقاد."
                : "When people grow, organizations and communities move forward. Every engagement we take on is built on that belief."}
            </blockquote>
            <Link
              href="/about"
              className="mt-6 inline-flex items-center gap-1 font-semibold text-[#1A6B5A] hover:underline"
            >
              {isAr ? "اقرأ قصته ←" : "Read his story →"}
            </Link>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-y border-gray-100 bg-white px-4 py-12 md:px-6">
        <p className="text-center text-sm uppercase tracking-wide text-[#6B7280]">
          {isAr ? "يثق بنا قادة المنظمات" : "Trusted by leading organizations"}
        </p>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-8 md:gap-12">
          {trusted.map((name) => (
            <span
              key={name}
              className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-400 opacity-60 transition-opacity hover:opacity-100"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Why Basalim */}
      <section className="bg-[#0D1F2D] px-4 py-20 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-3xl text-3xl font-bold md:text-[2.625rem]">
            {isAr
              ? "كل تحدٍّ في مجال الناس هو فرصة للنمو"
              : "Every People Challenge is a Growth Opportunity."}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.titleEn}
                  className="rounded-xl border border-white/10 bg-white/5 p-8"
                >
                  <Icon className="h-8 w-8 text-[#1A6B5A]" aria-hidden />
                  <h3 className="mt-4 font-bold">{isAr ? v.titleAr : v.titleEn}</h3>
                  <p className="mt-2 text-sm text-white/70">{isAr ? v.descAr : v.descEn}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <QudrahtechHomeSplitSection locale={locale} />

      {/* Insights */}
      <section className="bg-white px-4 py-20 md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1A6B5A]">Insights</p>
          <h2 className="mt-2 text-3xl font-bold text-[#0D1F2D] md:text-[2.625rem]">
            {isAr ? "أفكار تُقدّم الناس إلى الأمام" : "Ideas That Move People Forward."}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            {isAr
              ? "وجهات نظر عملية حول الناس والقيادة ومستقبل العمل"
              : "Practical perspectives on people, leadership and the future of work."}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {insights.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-gray-100 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-xs font-semibold uppercase text-[#1A6B5A]">
                  {isAr ? item.catAr : item.catEn}
                </span>
                <h3 className="mt-3 text-lg font-bold text-[#0D1F2D] group-hover:text-[#1A6B5A]">
                  {isAr ? item.titleAr : item.titleEn}
                </h3>
                <p className="mt-4 text-sm text-[#6B7280]">{item.date}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/insights"
              className="inline-flex rounded-md bg-[#1A6B5A] px-8 py-3 text-sm font-semibold text-white hover:bg-[#155A4A]"
            >
              {isAr ? "عرض جميع المقالات ←" : "View All Insights →"}
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#F5F3EE] px-4 py-20 text-center md:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0D1F2D] md:text-[2.625rem]">
            {isAr ? "هل أنت مستعد لبناء منظمة أقوى؟" : "Ready to Build a Stronger Organization?"}
          </h2>
          <p className="mt-4 text-lg text-[#6B7280]">
            {isAr
              ? "دعنا نتحدث عن تحديات مواردك البشرية"
              : "Let's talk about your people, talent and organization challenges."}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex justify-center rounded-md bg-[#1A6B5A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#155A4A]"
            >
              {isAr ? "احجز استشارة" : "Book a Consultation"}
            </Link>
            <Link
              href="/services"
              className="inline-flex justify-center rounded-md border-2 border-[#0D1F2D] px-8 py-3.5 text-sm font-semibold text-[#0D1F2D] hover:bg-white/50"
            >
              {isAr ? "استكشف خدماتنا" : "Explore Our Services"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
