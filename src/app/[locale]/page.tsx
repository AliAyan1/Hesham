import type { ComponentProps } from "react";
import { getTranslations } from "next-intl/server";
import { redirectAuthenticatedUserFromMarketing } from "@/lib/public-page-auth";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { TrustedAssessmentsSection } from "@/components/landing/TrustedAssessmentsSection";
import { Link } from "@/i18n/navigation";
import {
  hrefRegisterFree,
  hrefRegisterEmployer,
  hrefRegisterPremium,
  hrefRegisterProfessional,
} from "@/lib/i18n-hrefs";
import {
  ArrowRight,
  Brain,
  FileText,
  Globe,
  GraduationCap,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

type AppLinkHref = ComponentProps<typeof Link>["href"];

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await redirectAuthenticatedUserFromMarketing(locale);
  const t = await getTranslations({ locale, namespace: "landing" });
  const isRTL = locale === "ar" || locale === "ur";

  const trusted = t("trustedNames")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "QudrahTech",
    url: "https://qudrahtech.sa",
  };

  const jsonLdApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QudrahTech",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "SAR",
    },
  };

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} guestOnly />

      <main>
        {/* Hero */}
        <section
          className="min-h-screen flex items-center"
          style={{
            backgroundImage: "radial-gradient(#0F4C7515 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="mx-auto w-full max-w-4xl px-6 py-20 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#0F4C75]/20 bg-[#EFF6FF] px-4 py-1.5 text-sm font-medium text-[#0F4C75]">
              <span aria-hidden>🚀</span>
              <span>{t("heroBadge").replace("🚀 ", "")}</span>
            </div>

            <h1 className="mt-7 text-balance text-5xl font-black tracking-tight text-[#0D2137] sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="block">{t("headlineKnowYour")}</span>
              <span className="block text-[#0F4C75]">{t("headlinePotential")}</span>
              <span className="block">{t("headlineShape")}</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-xl leading-relaxed text-[#6B7280]">
              {t("subheadline")}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={hrefRegisterFree}
                prefetch={false}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F4C75] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#0F4C75]/25 transition-all duration-200 hover:bg-[#0D2137] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center px-4 py-3 text-[#0F4C75] font-semibold hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {t("ctaSecondary")}
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-[#6B7280]">
              <span>{t("statsJobSeekers")}</span>
              <span aria-hidden>·</span>
              <span>{t("statsEmployers")}</span>
              <span aria-hidden>·</span>
              <span>{t("statsAccuracy")}</span>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="bg-[#F8FAFC] py-12">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
              {t("trustedBy")}
            </p>

            <div className="relative mt-8 overflow-hidden">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F8FAFC] to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#F8FAFC] to-transparent"
                aria-hidden
              />

              <div className="flex w-max animate-[marquee_18s_linear_infinite] items-center gap-10 py-2">
                {[...trusted, ...trusted].map((name, idx) => (
                  <span key={`${name}-${idx}`} className="text-lg font-semibold text-[#CBD5E1]">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9E75]">
              {t("howLabel")}
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[#0D2137]">{t("howTitle")}</h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <HowCard
                Icon={FileText}
                title={t("step1Title")}
                desc={t("step1Desc")}
              />
              <HowCard Icon={Brain} title={t("step2Title")} desc={t("step2Desc")} />
              <HowCard Icon={Rocket} title={t("step3Title")} desc={t("step3Desc")} />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-[#F8FAFC] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9E75]">
              {t("featuresLabel")}
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[#0D2137]">{t("featuresTitle")}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
              {t("featuresSubtitle")}
            </p>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                Icon={Sparkles}
                tone="blue"
                title={t("feature1Title")}
                desc={t("feature1Desc")}
              />
              <FeatureCard
                Icon={FileText}
                tone="teal"
                title={t("feature2Title")}
                desc={t("feature2Desc")}
              />
              <FeatureCard
                Icon={Rocket}
                tone="gold"
                title={t("feature3Title")}
                desc={t("feature3Desc")}
              />
              <FeatureCard
                Icon={ShieldCheck}
                tone="purple"
                title={t("feature4Title")}
                desc={t("feature4Desc")}
              />
              <FeatureCard
                Icon={GraduationCap}
                tone="rose"
                title={t("feature5Title")}
                desc={t("feature5Desc")}
              />
              <FeatureCard
                Icon={Globe}
                tone="green"
                title={t("feature6Title")}
                desc={t("feature6Desc")}
              />
            </div>
          </div>
        </section>

        <TrustedAssessmentsSection locale={locale} />

        {/* Audiences */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-4xl font-bold text-[#0D2137]">{t("audiencesTitle")}</h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <AudienceCard
                tone="blue"
                Icon={UserRound}
                title={t("jobSeekersTitle")}
                bullets={[
                  t("jobSeekersBullet1"),
                  t("jobSeekersBullet2"),
                  t("jobSeekersBullet3"),
                  t("jobSeekersBullet4"),
                  t("jobSeekersBullet5"),
                  t("jobSeekersBullet6"),
                ]}
                ctaLabel={t("audienceCtaJobSeekers")}
                ctaHref={hrefRegisterFree}
              />
              <AudienceCard
                tone="navy"
                Icon={ShieldCheck}
                title={t("employersTitle")}
                bullets={[
                  t("employersBullet1"),
                  t("employersBullet2"),
                  t("employersBullet3"),
                  t("employersBullet4"),
                  t("employersBullet5"),
                  t("employersBullet6"),
                ]}
                ctaLabel={t("audienceCtaEmployers")}
                ctaHref={hrefRegisterEmployer}
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-[#F8FAFC] py-24" id="pricing">
          <PricingSection locale={locale} />
        </section>

        {/* FAQ */}
        <section className="bg-white py-24">
          <FaqSection locale={locale} />
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-[#0F4C75] to-[#0D2137] py-24 text-white">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-4xl font-bold">{t("finalCtaTitle")}</h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={hrefRegisterFree}
                prefetch={false}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#0D2137] transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {t("finalCtaPrimary")}
              </Link>
              <Link
                href={hrefRegisterEmployer}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {t("finalCtaSecondary")}
                <ArrowRight className="h-5 w-5 shrink-0 rtl:rotate-180" aria-hidden strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
        />
      </main>

      <Footer locale={locale} />
    </div>
  );
}

function HowCard({
  Icon,
  title,
  desc,
}: {
  Icon: typeof FileText;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#EFF6FF]">
        <Icon className="h-6 w-6 text-[#0F4C75]" strokeWidth={2} aria-hidden />
      </div>
      <h3 className="mt-4 text-xl font-bold text-[#0D2137]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{desc}</p>
    </div>
  );
}

function FeatureCard({
  Icon,
  tone,
  title,
  desc,
}: {
  Icon: typeof FileText;
  tone: "blue" | "teal" | "gold" | "purple" | "rose" | "green";
  title: string;
  desc: string;
}) {
  const toneMap = {
    blue: { bg: "#EFF6FF", fg: "#0F4C75" },
    teal: { bg: "#E1F5EE", fg: "#1D9E75" },
    gold: { bg: "#FDF3E3", fg: "#C9973A" },
    purple: { bg: "#F5F3FF", fg: "#7C3AED" },
    rose: { bg: "#FFF1F2", fg: "#E11D48" },
    green: { bg: "#ECFDF5", fg: "#059669" },
  } as const;

  const c = toneMap[tone];
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: c.bg }}
      >
        <Icon className="h-6 w-6" style={{ color: c.fg }} strokeWidth={2} aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-bold text-[#0D2137]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{desc}</p>
    </div>
  );
}

function AudienceCard({
  tone,
  Icon,
  title,
  bullets,
  ctaLabel,
  ctaHref,
}: {
  tone: "blue" | "navy";
  Icon: typeof UserRound;
  title: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: AppLinkHref;
}) {
  const bg = tone === "blue" ? "#0F4C75" : "#0D2137";

  return (
    <div className="rounded-2xl p-10 text-white" style={{ backgroundColor: bg }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
      </div>
      <h3 className="mt-6 text-2xl font-bold">{title}</h3>
      <ul className="mt-6 grid gap-3 text-sm text-white/90">
        {bullets.map((b, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/60" aria-hidden />
            <span className="min-w-0">{b}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        prefetch={ctaHref === hrefRegisterFree ? false : undefined}
        className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-center text-sm font-semibold text-[#0D2137] shadow-sm transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden strokeWidth={2} />
      </Link>
    </div>
  );
}

async function PricingSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const tp = await getTranslations({ locale, namespace: "pages.pricing" });

  return (
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="text-4xl font-bold text-[#0D2137]">{t("pricingTitle")}</h2>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <PriceCard
          name={t("priceFreeName")}
          price={t("priceFreeValue")}
          variant="free"
          ctaLabel={t("finalCtaPrimary")}
          ctaHref={hrefRegisterFree}
          features={[
            t("priceFreeFeature1"),
            t("priceFreeFeature2"),
            t("priceFreeFeature3"),
            t("priceFreeFeature4"),
          ]}
        />
        <PriceCard
          name={t("priceProName")}
          price={t("priceProValue")}
          variant="pro"
          badge={t("priceProBadge")}
          ctaLabel={tp("ctaProfessional")}
          ctaHref={hrefRegisterProfessional}
          features={[
            t("priceProFeature1"),
            t("priceProFeature2"),
            t("priceProFeature3"),
            t("priceProFeature4"),
          ]}
        />
        <PriceCard
          name={t("pricePremiumName")}
          price={t("pricePremiumValue")}
          variant="premium"
          badge={t("pricePremiumBadge")}
          ctaLabel={tp("ctaPremium")}
          ctaHref={hrefRegisterPremium}
          features={[
            t("pricePremiumFeature1"),
            t("pricePremiumFeature2"),
            t("pricePremiumFeature3"),
            t("pricePremiumFeature4"),
          ]}
        />
      </div>
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
}: {
  name: string;
  price: string;
  variant: "free" | "pro" | "premium";
  badge?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: AppLinkHref;
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
      {badge ? (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            variant === "pro"
              ? "bg-[#1D9E75] text-white"
              : "bg-[#C9973A] text-white"
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
              ? "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              : variant === "premium"
                ? "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0D2137] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                : "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          }
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

async function FaqSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const items = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6">
      <h2 className="text-center text-4xl font-bold text-[#0D2137]">{t("faqTitle")}</h2>
      <div className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-100 bg-white">
        {items.map((it, idx) => (
          <details key={idx} className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start text-base font-semibold text-[#0D2137]">
              <span>{it.q}</span>
              <span className="text-brand-teal" aria-hidden>
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
