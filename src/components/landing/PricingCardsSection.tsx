import type { ComponentProps } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type AppLinkHref = ComponentProps<typeof Link>["href"];

type PricingCardsSectionProps = {
  locale: string;
  showHeader?: boolean;
  className?: string;
};

export async function PricingCardsSection({
  locale,
  showHeader = true,
  className = "",
}: PricingCardsSectionProps) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const isRtl = locale === "ar" || locale === "ur";

  return (
    <div className={className} dir={isRtl ? "rtl" : "ltr"}>
      {showHeader ? (
        <>
          <h2 className="text-4xl font-bold text-[#0D2137]">{t("pricingNew.title")}</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#6B7280]">{t("pricingNew.subtitle")}</p>
        </>
      ) : null}

      <div className={showHeader ? "mt-10 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-4" : "grid grid-cols-1 items-stretch gap-4 lg:grid-cols-4"}>
        <NewPriceCard
          variant="free"
          badge={t("pricingNew.free.badge")}
          title={t("pricingNew.free.title")}
          price={t("pricingNew.free.price")}
          features={pricingFeatures(t, "pricingNew.free.features")}
          ctaLabel={t("pricingNew.free.cta")}
          ctaHref={{ pathname: "/auth/register", query: { plan: "free" } }}
        />
        <NewPriceCard
          variant="pro"
          badge={t("pricingNew.pro.badge")}
          title={t("pricingNew.pro.title")}
          price={t("pricingNew.pro.price")}
          vatNote={t("pricingNew.vat")}
          features={pricingFeatures(t, "pricingNew.pro.features")}
          ctaLabel={t("pricingNew.pro.cta")}
          ctaHref={{ pathname: "/auth/register", query: { plan: "professional" } }}
        />
        <NewPriceCard
          variant="premium"
          badge={t("pricingNew.premium.badge")}
          title={t("pricingNew.premium.title")}
          price={t("pricingNew.premium.price")}
          vatNote={t("pricingNew.vat")}
          features={pricingFeatures(t, "pricingNew.premium.features")}
          ctaLabel={t("pricingNew.premium.cta")}
          ctaHref={{ pathname: "/auth/register", query: { plan: "premium" } }}
        />
        <NewPriceCard
          variant="mentor"
          badge={t("pricingNew.mentor.badge")}
          title={t("pricingNew.mentor.title")}
          subtitle={t("pricingNew.mentor.subtitle")}
          price={t("pricingNew.mentor.price")}
          features={pricingFeatures(t, "pricingNew.mentor.features")}
          ctaLabel={t("pricingNew.mentor.cta")}
          ctaHref={{ pathname: "/auth/register", query: { role: "mentor" } }}
          highlightBorder
        />
      </div>
    </div>
  );
}

function pricingFeatures(
  t: Awaited<ReturnType<typeof getTranslations<"landing">>>,
  prefix: string,
): string[] {
  const features: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const key = `${prefix}.${i}`;
    if (!t.has(key)) break;
    features.push(t(key));
  }
  return features;
}

function NewPriceCard({
  variant,
  badge,
  title,
  subtitle,
  price,
  vatNote,
  features,
  ctaLabel,
  ctaHref,
  highlightBorder,
}: {
  variant: "free" | "pro" | "premium" | "mentor";
  badge: string;
  title: string;
  subtitle?: string;
  price: string;
  vatNote?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: AppLinkHref;
  highlightBorder?: boolean;
}) {
  const base =
    "flex h-full flex-col rounded-2xl p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md";
  const style =
    variant === "pro"
      ? "bg-[#0F4C75] text-white shadow-xl hover:shadow-2xl"
      : variant === "mentor"
        ? "bg-[#0D2137] text-white"
        : "bg-white text-[#0D2137]";
  const border =
    variant === "premium" || highlightBorder
      ? "border-2 border-[#C9973A]"
      : variant === "pro"
        ? "border border-[#0F4C75]"
        : "border border-gray-200";

  const badgeStyle =
    variant === "free"
      ? "bg-[#0F4C75] text-white"
      : variant === "pro"
        ? "bg-[#1D9E75] text-white"
        : "bg-[#C9973A] text-white";

  const listText = variant === "pro" || variant === "mentor" ? "text-white/90" : "text-[#6B7280]";

  const ctaClass =
    variant === "mentor"
      ? "bg-[#1D9E75] text-white hover:bg-[#12815E]"
      : variant === "pro"
        ? "bg-white font-bold text-[#0F4C75] hover:bg-gray-50"
        : variant === "premium"
          ? "bg-[#C9973A] text-white hover:bg-[#B8872A]"
          : "bg-[#0F4C75] text-white hover:bg-[#0D2137]";

  return (
    <div className={`${base} ${border} ${style}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}>
            {badge}
          </span>
          <h3 className="mt-4 text-[18px] font-bold leading-tight">
            {title}
            {subtitle ? (
              <span className="mt-1 block text-[13px] font-semibold opacity-90">{subtitle}</span>
            ) : null}
          </h3>
        </div>
        {variant === "mentor" ? (
          <span
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            aria-hidden
          >
            🎓
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[28px] font-black">{price}</p>
      {vatNote ? (
        <p className={`mt-1 text-[10px] ${variant === "pro" ? "text-white/60" : "text-gray-500"}`}>
          {vatNote}
        </p>
      ) : null}

      <ul className={`mt-6 grid gap-[14px] text-[13px] leading-snug ${listText}`}>
        {features.map((f, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Link
          href={ctaHref}
          prefetch={false}
          className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal ${ctaClass}`}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
