import { getTranslations } from "next-intl/server";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Link } from "@/i18n/navigation";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.about" });
  const isRTL = locale === "ar" || locale === "ur";

  const whyCards = [
    { icon: "🧠", title: t("why1Title"), desc: t("why1Desc") },
    { icon: "🛡️", title: t("why2Title"), desc: t("why2Desc") },
    { icon: "🎥", title: t("why3Title"), desc: t("why3Desc") },
    { icon: "🌍", title: t("why4Title"), desc: t("why4Desc") },
  ];

  const values = [
    { icon: "🤝", title: t("value1Title"), desc: t("value1Body") },
    { icon: "💡", title: t("value2Title"), desc: t("value2Body") },
    { icon: "🚀", title: t("value3Title"), desc: t("value3Body") },
  ];

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} guestOnly />

      <section
        className="px-8 py-20 text-center text-white"
        style={{ background: "linear-gradient(135deg, #0F4C75 0%, #0D2137 100%)" }}
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9E75]">
          {t("heroLabel")}
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-bold leading-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70">
          {t("heroSubtitle")}
        </p>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9E75]">
              {t("missionLabel")}
            </p>
            <h2 className="mt-3 text-[32px] font-bold leading-tight text-[#0D2137]">
              {t("missionHeadline")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#6B7280]">{t("missionBody")}</p>
          </div>
          <div className="grid gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-100 border-l-4 border-l-[#1D9E75] bg-white p-6 shadow-sm rtl:border-l-0 rtl:border-r-4 rtl:border-r-[#1D9E75]"
              >
                <p className="text-2xl font-bold text-[#0D2137]">{stat.value}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-[#0D2137]">{t("whyTitle")}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {whyCards.map((card) => (
              <div key={card.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-2xl" aria-hidden>
                  {card.icon}
                </p>
                <h3 className="mt-3 text-lg font-bold text-[#0D2137]">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-[#0D2137]">{t("valuesTitle")}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="text-center">
                <p className="text-3xl" aria-hidden>
                  {v.icon}
                </p>
                <h3 className="mt-3 text-lg font-bold text-[#0D2137]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F4C75] px-6 py-16">
        <div className="mx-auto max-w-6xl text-center text-white">
          <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0F4C75] hover:bg-gray-50"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/register?role=employer"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      <Footer locale={locale} />
    </div>
  );
}
