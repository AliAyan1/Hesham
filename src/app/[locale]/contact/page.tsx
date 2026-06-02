import { getTranslations } from "next-intl/server";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { ContactForm } from "@/components/contact/ContactForm";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contact" });
  const isRTL = locale === "ar" || locale === "ur";

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} guestOnly />

      <section className="bg-[#F8FAFC] px-6 py-16">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6B7280]">{t("subtitle")}</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <aside className="rounded-2xl bg-[#0D2137] p-8 text-white">
            <h2 className="text-xl font-bold">{t("infoTitle")}</h2>
            <ul className="mt-8 space-y-5 text-sm leading-relaxed">
              <li>
                <p className="font-semibold">📍 {t("locationLabel")}</p>
                <p className="mt-1 text-white/70">{t("locationValue")}</p>
              </li>
              <li>
                <p className="font-semibold">📧 {t("emailLabel")}</p>
                <p className="mt-1 text-white/70">{t("emailValue")}</p>
              </li>
              <li>
                <p className="font-semibold">🕐 {t("responseLabel")}</p>
                <p className="mt-1 text-white/70">{t("responseValue")}</p>
              </li>
              <li>
                <p className="font-semibold">🌐 {t("platformLabel")}</p>
                <p className="mt-1 text-white/70">{t("platformValue")}</p>
              </li>
            </ul>
          </aside>

          <ContactForm />
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
