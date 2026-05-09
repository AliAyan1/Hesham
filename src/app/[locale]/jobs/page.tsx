import { getTranslations } from "next-intl/server";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { JobsClient } from "@/app/[locale]/jobs/JobsClient";

export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.jobs" });
  const isRTL = locale === "ar" || locale === "ur";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-3xl">
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#6B7280]">{t("subtitle")}</p>
        </div>

        <div className="mt-10">
          <JobsClient />
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
