import { getTranslations } from "next-intl/server";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.legal" });
  const isRTL = locale === "ar" || locale === "ur";
  const date = new Date().toLocaleDateString(locale);

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
          {t("privacyTitle")}
        </h1>
        <p className="mt-3 text-sm text-[#6B7280]">{t("updatedAt", { date })}</p>
        <div className="prose prose-slate mt-10 max-w-none">
          <p className="text-[#6B7280]">{t("bodyPlaceholder")}</p>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

