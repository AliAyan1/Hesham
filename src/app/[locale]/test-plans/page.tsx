import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlanTestClient } from "./plan-test-client";

export default async function TestPlansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);

  const t = await getTranslations({ locale, namespace: "subscription" });
  const isRTL = locale === "ar" || locale === "ur";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#F8FAFC] text-gray-900">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-balance text-3xl font-black tracking-tight text-[#0D2137] sm:text-4xl">
          {t("testSwitcherTitle")}
        </h1>
        <p className="mt-3 text-sm text-[#6B7280]">{t("testSwitcherSubtitle")}</p>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <PlanTestClient />
        </div>
      </main>
    </div>
  );
}

