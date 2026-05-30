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

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} guestOnly />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#6B7280]">{t("subtitle")}</p>
        </div>

        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[#0D2137]">{t("missionTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{t("missionBody")}</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[#0D2137]">{t("valuesTitle")}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <ValueCard title={t("value1Title")} body={t("value1Body")} />
              <ValueCard title={t("value2Title")} body={t("value2Body")} />
              <ValueCard title={t("value3Title")} body={t("value3Body")} />
            </div>
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F4C75] to-[#0D2137] p-10 text-white">
          <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
          <div className="mt-6">
            <Link
              href={{ pathname: "/auth/register", query: { plan: "free" } }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            >
              {t("ctaButton")}
            </Link>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-5">
      <p className="text-sm font-bold text-[#0D2137]">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">{body}</p>
    </div>
  );
}

