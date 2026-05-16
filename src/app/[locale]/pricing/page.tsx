import type { ComponentProps, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Link } from "@/i18n/navigation";
import {
  hrefRegisterFree,
  hrefRegisterPremium,
  hrefRegisterProfessional,
} from "@/lib/i18n-hrefs";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { PricingTestTierButton } from "./PricingTestTierButton";

type AppLinkHref = ComponentProps<typeof Link>["href"];

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.pricing" });
  const tl = await getTranslations({ locale, namespace: "landing" });
  const ts = await getTranslations({ locale, namespace: "subscription" });
  const isRTL = locale === "ar" || locale === "ur";

  const session = await getServerSession();
  const userId = session?.user?.id ?? null;
  const prisma = userId ? getPrisma() : null;
  const user = userId
    ? await prisma!.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      })
    : null;
  const currentTier = user?.subscriptionTier ?? null;

  const isLoggedIn = Boolean(userId);
  const showDevTierTest = process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#6B7280]">{t("subtitle")}</p>
        </div>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <PriceCard
            name={tl("priceFreeName")}
            price={tl("priceFreeValue")}
            variant="free"
            ctaLabel={tl("finalCtaPrimary")}
            ctaHref={hrefRegisterFree as AppLinkHref}
            current={currentTier === "FREE"}
            currentBadge={ts("currentPlan")}
            features={[
              tl("priceFreeFeature1"),
              tl("priceFreeFeature2"),
              tl("priceFreeFeature3"),
              tl("priceFreeFeature4"),
            ]}
          />
          <PriceCard
            name={tl("priceProName")}
            price={tl("priceProValue")}
            variant="pro"
            badge={tl("priceProBadge")}
            ctaLabel={t("ctaProfessional")}
            ctaHref={hrefRegisterProfessional as AppLinkHref}
            current={currentTier === "PROFESSIONAL"}
            currentBadge={ts("currentPlan")}
            features={[
              tl("priceProFeature1"),
              tl("priceProFeature2"),
              tl("priceProFeature3"),
              tl("priceProFeature4"),
            ]}
            devTestSlot={
              showDevTierTest ? (
                <PricingTestTierButton
                  tier="PROFESSIONAL"
                  variant="pro"
                  isLoggedIn={isLoggedIn}
                />
              ) : null
            }
          />
          <PriceCard
            name={tl("pricePremiumName")}
            price={tl("pricePremiumValue")}
            variant="premium"
            badge={tl("pricePremiumBadge")}
            ctaLabel={t("ctaPremium")}
            ctaHref={hrefRegisterPremium as AppLinkHref}
            current={currentTier === "PREMIUM"}
            currentBadge={ts("currentPlan")}
            features={[
              tl("pricePremiumFeature1"),
              tl("pricePremiumFeature2"),
              tl("pricePremiumFeature3"),
              tl("pricePremiumFeature4"),
            ]}
            devTestSlot={
              showDevTierTest ? (
                <PricingTestTierButton
                  tier="PREMIUM"
                  variant="premium"
                  isLoggedIn={isLoggedIn}
                />
              ) : null
            }
          />
        </section>

        <section className="mt-14 rounded-2xl border border-gray-100 bg-[#F8FAFC] p-8">
          <h2 className="text-xl font-bold text-[#0D2137]">{t("comparisonTitle")}</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[720px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-start text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
                  <th className="py-3 pe-4">{tl("featuresTitle")}</th>
                  <th className="py-3 pe-4">{tl("priceFreeName")}</th>
                  <th className="py-3 pe-4">{tl("priceProName")}</th>
                  <th className="py-3 pe-4">{tl("pricePremiumName")}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { k: tl("feature2Title"), f: [true, true, true] },
                  { k: tl("feature1Title"), f: [true, true, true] },
                  { k: tl("feature3Title"), f: [true, true, true] },
                  { k: tl("feature5Title"), f: [false, true, true] },
                  { k: tl("feature4Title"), f: [false, false, true] },
                ].map((row) => (
                  <tr key={row.k} className="border-t border-gray-200/70">
                    <td className="py-4 pe-4 font-medium text-[#0D2137]">{row.k}</td>
                    {row.f.map((on, i) => (
                      <td key={i} className="py-4 pe-4 text-[#6B7280]">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                            on ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-white text-gray-300"
                          }`}
                          aria-label={on ? "Included" : "Not included"}
                        >
                          {on ? "✓" : "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F4C75] to-[#0D2137] p-10 text-white">
          <h2 className="text-2xl font-bold">{tl("finalCtaTitle")}</h2>
          <p className="mt-3 text-sm text-white/80">{t("faqTitle")}</p>
          <div className="mt-6">
            <Link
              href={hrefRegisterFree as AppLinkHref}
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            >
              {tl("finalCtaPrimary")}
            </Link>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

function PriceCard({
  name,
  price,
  variant,
  badge,
  features,
  ctaLabel,
  ctaHref,
  current,
  currentBadge,
  devTestSlot,
}: {
  name: string;
  price: string;
  variant: "free" | "pro" | "premium";
  badge?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: AppLinkHref;
  current: boolean;
  currentBadge: string;
  devTestSlot?: ReactNode;
}) {
  const styles =
    variant === "pro"
      ? "bg-[#0F4C75] text-white scale-[1.02] shadow-xl"
      : "bg-white text-[#0D2137]";
  const border =
    variant === "premium"
      ? "border-2 border-[#C9973A]"
      : "border border-gray-200";

  return (
    <div className={`rounded-2xl p-8 ${border} ${styles}`}>
      {current ? (
        <span className="inline-flex rounded-full bg-[#E1F5EE] px-3 py-1 text-xs font-semibold text-[#1D9E75]">
          ✓ {currentBadge}
        </span>
      ) : badge ? (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            variant === "pro" ? "bg-[#1D9E75] text-white" : "bg-[#C9973A] text-white"
          }`}
        >
          {badge}
        </span>
      ) : null}
      <h3 className="mt-4 text-xl font-bold">{name}</h3>
      <p className={`mt-2 text-3xl font-black ${variant === "pro" ? "text-white" : ""}`}>
        {price}
      </p>
      <ul
        className={`mt-6 grid gap-3 text-sm ${
          variant === "pro" ? "text-white/90" : "text-[#6B7280]"
        }`}
      >
        {features.map((f, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                variant === "pro" ? "bg-white/60" : "bg-[#0F4C75]/25"
              }`}
              aria-hidden
            />
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link
          href={ctaHref}
          prefetch={variant === "free" ? false : undefined}
          className={
            variant === "pro"
              ? "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-white/90"
              : variant === "premium"
                ? "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0D2137]"
                : "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-gray-50"
          }
        >
          {ctaLabel}
        </Link>
      </div>
      {devTestSlot}
    </div>
  );
}

