import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { UpgradeConfirm } from "./upgrade-confirm";

export default async function UpgradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  const { plan } = await searchParams;
  const isRTL = locale === "ar" || locale === "ur";

  const t = await getTranslations({ locale, namespace: "subscription" });
  const session = await getServerSession();
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
        <main className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-3xl font-black text-[#0D2137]">{t("upgrade")}</h1>
          <p className="mt-4 text-[#6B7280]">{t("upgradeLoginRequired")}</p>
          <div className="mt-8">
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0D2137]"
            >
              {t("login")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });

  const selected = plan === "premium" ? "premium" : plan === "professional" ? "professional" : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-balance text-4xl font-black tracking-tight text-[#0D2137]">{t("upgrade")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-[#6B7280]">{t("upgradeMessage")}</p>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{t("currentPlan")}</p>
          <p className="mt-2 text-2xl font-extrabold text-[#0D2137]">
            {user?.subscriptionTier ? t(user.subscriptionTier.toLowerCase()) : t("free")}
          </p>

          <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#0F4C75] to-[#0D2137] p-6 text-white">
            <p className="text-sm font-semibold text-white/80">{t("upgradingTo")}</p>
            <p className="mt-2 text-2xl font-extrabold">
              {selected ? t(selected) : t("selectPlan")}
            </p>
            <p className="mt-3 text-sm text-white/70">{t("upgradeNotice")}</p>

            <div className="mt-6">
              <UpgradeConfirm selectedPlan={selected} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

