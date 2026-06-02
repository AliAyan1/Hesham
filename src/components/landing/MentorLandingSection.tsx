"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hrefRegisterMentor } from "@/lib/i18n-hrefs";

function formatSar(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

export function MentorLandingSection() {
  const t = useTranslations("landing.mentor");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const [sessionsPerWeek, setSessionsPerWeek] = useState(4);
  const [ratePerHour, setRatePerHour] = useState(200);

  const monthly = useMemo(() => {
    const safeSessions = Number.isFinite(sessionsPerWeek) ? Math.max(0, sessionsPerWeek) : 0;
    const safeRate = Number.isFinite(ratePerHour) ? Math.max(0, ratePerHour) : 0;
    const gross = safeSessions * 4 * safeRate;
    const net = Math.round(gross * 0.75);
    return { gross, net };
  }, [sessionsPerWeek, ratePerHour]);

  return (
    <section className="bg-[#0D2137] px-6 py-20 text-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9E75]">{t("label")}</p>
          <h2 className="mt-3 text-4xl font-black leading-tight">{t("title")}</h2>
          <p className="mt-4 max-w-xl whitespace-pre-line text-sm leading-relaxed text-white/70">{t("subtitle")}</p>

          <div className="mt-8">
            <h3 className="text-xl font-bold text-white">{t("mentorPromptTitle")}</h3>
            <p className="mt-2 max-w-xl whitespace-pre-line text-sm text-white/70">{t("mentorPromptSubtitle")}</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <BenefitCard title={t("benefit1Title")} desc={t("benefit1Desc")} />
            <BenefitCard title={t("benefit2Title")} desc={t("benefit2Desc")} />
            <BenefitCard title={t("benefit3Title")} desc={t("benefit3Desc")} />
          </div>

          <div className="mt-10">
            <Link
              href={hrefRegisterMentor}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1D9E75] px-6 py-3 text-sm font-semibold text-white hover:bg-[#12815E]"
            >
              {t("cta")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#0D2137] shadow-xl">
          <h3 className="text-lg font-bold">{t("calcTitle")}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{t("calcSubtitle")}</p>

          <div className="mt-6 grid gap-4">
            <label className="text-sm font-semibold">
              {t("sessionsPerWeek")}
              <input
                type="number"
                min={0}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(Number.parseInt(e.target.value || "0", 10))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2"
              />
            </label>

            <label className="text-sm font-semibold">
              {t("ratePerHour")}
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-sm font-bold text-[#0F4C75]">SAR</span>
                <input
                  type="number"
                  min={0}
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(Number.parseInt(e.target.value || "0", 10))}
                  className="w-full outline-none"
                />
              </div>
            </label>

            <div className="rounded-xl bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{t("monthlyEarning")}</p>
              <p className="mt-2 text-2xl font-black">
                SAR {formatSar(monthly.net, locale)}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">{t("afterFee")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm text-white/70">{desc}</p>
    </div>
  );
}

