import { Check } from "lucide-react";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimStatsRow } from "@/components/basalim/BasalimStatsRow";
import { BasalimCta } from "@/components/basalim/BasalimCta";
import type { ServicePageConfig } from "@/lib/basalim/services-data";

type ServiceDetailPageProps = {
  locale: string;
  config: ServicePageConfig;
};

export function ServiceDetailPage({ locale, config }: ServiceDetailPageProps) {
  const isAr = locale === "ar";

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn={config.hero.en}
        titleAr={config.hero.ar}
        subtitleEn={config.hero.subtitleEn}
        subtitleAr={config.hero.subtitleAr}
      />

      {config.stats ? <BasalimStatsRow locale={locale} stats={config.stats} /> : null}

      {config.items ? (
        <section className="bg-white px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-[#0D1F2D]">
              {isAr ? "ما نقدمه" : "What We Deliver"}
            </h2>
            <ul className="mt-8 space-y-3">
              {config.items.map((item) => (
                <li
                  key={item.en}
                  className="flex gap-3 rounded-lg border border-gray-100 bg-[#FAFAF9] px-4 py-3 text-[#0D1F2D]"
                >
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1A6B5A]" aria-hidden />
                  <span>{isAr ? item.ar : item.en}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {config.processSteps ? (
        <section className="bg-[#F5F3EE] px-4 py-16 md:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {config.processSteps.map((step, i) => (
                <div key={step.en} className="flex shrink-0 items-center gap-2">
                  <div className="min-w-[5.5rem] rounded-lg bg-white px-3 py-3 text-center text-xs font-semibold text-[#0D1F2D] shadow-sm md:text-sm">
                    {isAr ? step.ar : step.en}
                  </div>
                  {i < config.processSteps!.length - 1 ? (
                    <span className="text-[#1A6B5A]" aria-hidden>
                      →
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            {config.processTagline ? (
              <p className="mt-8 text-center text-xl font-bold text-[#0D1F2D] md:text-2xl">
                {isAr ? config.processTagline.ar : config.processTagline.en}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {config.journeyHeadline ? (
        <section className="bg-white px-4 py-16 md:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="whitespace-pre-line text-2xl font-bold text-[#0D1F2D] md:text-3xl">
              {isAr ? config.journeyHeadline.ar : config.journeyHeadline.en}
            </p>
            {config.journeySteps ? (
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {config.journeySteps.map((s) => (
                  <span
                    key={s.en}
                    className="rounded-full bg-[#1A6B5A]/10 px-4 py-2 text-sm font-semibold text-[#1A6B5A]"
                  >
                    {isAr ? s.ar : s.en}
                  </span>
                ))}
              </div>
            ) : null}
            {config.journeyTagline ? (
              <p className="mt-10 whitespace-pre-line text-xl font-bold text-[#0D1F2D]">
                {isAr ? config.journeyTagline.ar : config.journeyTagline.en}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {config.numberedSteps ? (
        <section className="bg-white px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {config.numberedSteps.map((step, i) => (
              <div
                key={step.en}
                className="flex gap-4 rounded-xl border border-gray-100 p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A6B5A] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-[#0D1F2D] md:text-base">
                  {isAr ? step.ar : step.en}
                </p>
              </div>
            ))}
          </div>
          {config.positioning ? (
            <div className="mx-auto mt-12 max-w-3xl text-center">
              <p className="text-2xl font-bold text-[#0D1F2D]">
                {isAr ? config.positioning.ar : config.positioning.en}
              </p>
              {config.positioningSub ? (
                <p className="mt-4 text-[#6B7280]">
                  {isAr ? config.positioningSub.ar : config.positioningSub.en}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {config.outcomes ? (
        <section className="bg-[#0D1F2D] px-4 py-16 text-white md:px-6">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {config.outcomes.map((o) => (
              <div
                key={o.en}
                className="rounded-xl border border-white/10 bg-white/5 p-8 text-center"
              >
                <p className="text-lg font-semibold">{isAr ? o.ar : o.en}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {config.statCards ? (
        <BasalimStatsRow locale={locale} stats={config.statCards} dark />
      ) : null}

      {config.quote ? (
        <section className="bg-[#F5F3EE] px-4 py-14 text-center md:px-6">
          <blockquote className="whitespace-pre-line text-2xl font-bold text-[#0D1F2D] md:text-3xl">
            {isAr ? config.quote.ar : config.quote.en}
          </blockquote>
        </section>
      ) : null}

      <BasalimCta
        locale={locale}
        titleEn={config.cta.en}
        titleAr={config.cta.ar}
        buttonEn={config.cta.buttonEn}
        buttonAr={config.cta.buttonAr}
      />
    </>
  );
}
