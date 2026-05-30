"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { ALL_TRAITS, TRAIT_LABELS } from "@/lib/assessment/profilext-traits";
import type { TraitScoresMap, WrittenReport } from "@/lib/assessment/profilext-types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";

type ReportData = {
  id: string;
  candidateName: string;
  completedAt: string | null;
  traitScores: TraitScoresMap;
  thinkingStyleScore: number | null;
  behavioralScore: number | null;
  interestsScore: number | null;
  overallScore: number | null;
  writtenReport: WrittenReport | null;
  shareWithEmployers: boolean;
};

function scoreRange(score: number): "low" | "mid" | "high" {
  if (score <= 3) return "low";
  if (score <= 7) return "mid";
  return "high";
}

function TraitBar({
  trait,
  score,
  locale,
  t,
}: {
  trait: (typeof ALL_TRAITS)[number];
  score: number;
  locale: string;
  t: ReturnType<typeof useTranslations<"assessment">>;
}) {
  const isRtl = locale === "ar" || locale === "ur";
  const label = TRAIT_LABELS[trait];
  const name = isRtl ? label.ar : label.en;
  const range = scoreRange(score);
  const rangeLabel =
    range === "low" ? t("report.rangeLow") : range === "mid" ? t("report.rangeMid") : t("report.rangeHigh");

  return (
    <div className="rounded-lg border border-[#EEF2F7] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#0D2137]">{name}</span>
        <span className="rounded-md bg-[#0F4C75] px-2 py-1 text-sm font-bold text-white">{score}</span>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-[#9CA3AF]">
        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
          <span
            key={n}
            className={`flex h-7 w-7 items-center justify-center rounded ${
              n === score ? "bg-[#1D9E75] font-bold text-white" : "bg-[#F3F4F6]"
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF2F7]">
        <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${score * 10}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#6B7280]">{rangeLabel}</p>
    </div>
  );
}

export default function ProfileXtReportClient({ assessmentId }: { assessmentId: string }) {
  const t = useTranslations("assessment");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const [data, setData] = useState<ReportData | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/assessment/detail?id=${encodeURIComponent(assessmentId)}`, {
      credentials: "include",
    });
    const j = (await res.json()) as { success?: boolean; data?: ReportData };
    if (!res.ok || !j.success || !j.data) throw new Error("load");
    setData(j.data);
  }, [assessmentId]);

  useEffect(() => {
    void load().catch(() => setErr(true));
  }, [load]);

  if (err) {
    return <ErrorState title={tc("error")} retryLabel={tc("retry")} onRetry={() => window.location.reload()} />;
  }
  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  const report = data.writtenReport;
  const traitScores = data.traitScores ?? {};

  return (
    <div className="space-y-10" dir={isRtl ? "rtl" : "ltr"}>
      <header className="rounded-xl border border-[#EEF2F7] bg-gradient-to-br from-[#0F4C75] to-[#1D9E75] p-8 text-white">
        <p className="text-sm opacity-90">{t("report.subtitle")}</p>
        <h1 className="mt-2 text-2xl font-bold">{t("report.title")}</h1>
        <p className="mt-1 text-lg">{data.candidateName}</p>
        {data.completedAt ? (
          <p className="mt-2 text-sm opacity-80">
            {t("report.date")}: {new Date(data.completedAt).toLocaleDateString(isRtl ? "ar" : "en-GB")}
          </p>
        ) : null}
      </header>

      <section>
        <h2 className="text-xl font-bold text-[#0F4C75]">{t("report.graphicSummary")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-[#6B7280]">{t("report.thinkingFit")}</p>
            <p className="text-2xl font-bold text-[#1D9E75]">{data.thinkingStyleScore ?? "—"}%</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-[#6B7280]">{t("report.behavioralFit")}</p>
            <p className="text-2xl font-bold text-[#1D9E75]">{data.behavioralScore ?? "—"}%</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-[#6B7280]">{t("report.interestsFit")}</p>
            <p className="text-2xl font-bold text-[#1D9E75]">{data.interestsScore ?? "—"}%</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {ALL_TRAITS.map((trait) => (
            <TraitBar key={trait} trait={trait} score={traitScores[trait] ?? 5} locale={locale} t={t} />
          ))}
        </div>
      </section>

      {report ? (
        <>
          <section>
            <h2 className="text-xl font-bold text-[#0F4C75]">{t("report.thinkingStyle")}</h2>
            <p className="mt-2 text-sm text-[#374151]">
              {isRtl ? report.thinkingStyle.overallDescriptionAr : report.thinkingStyle.overallDescription}
            </p>
            <div className="mt-4 space-y-6">
              {Object.values(report.thinkingStyle.traits).map((trait) =>
                trait ? (
                  <article key={trait.title} className="rounded-xl border bg-white p-6">
                    <h3 className="font-bold text-[#0D2137]">
                      {isRtl ? trait.titleAr : trait.title} — {trait.score}/10
                    </h3>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      {isRtl ? trait.definitionAr : trait.definition}
                    </p>
                    <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
                      {(isRtl ? trait.bulletPointsAr : trait.bulletPoints).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </article>
                ) : null,
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0F4C75]">{t("report.behavioralTraits")}</h2>
            <div className="mt-4 space-y-6">
              {Object.values(report.behavioralTraits.traits).map((trait) =>
                trait ? (
                  <article key={trait.title} className="rounded-xl border bg-white p-6">
                    <h3 className="font-bold text-[#0D2137]">
                      {isRtl ? trait.titleAr : trait.title} — {trait.score}/10
                    </h3>
                    <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
                      {(isRtl ? trait.bulletPointsAr : trait.bulletPoints).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </article>
                ) : null,
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0F4C75]">{t("report.interests")}</h2>
            <p className="mt-2 text-sm">{isRtl ? report.interests.descriptionAr : report.interests.description}</p>
            <ul className="mt-3 list-inside list-disc text-sm">
              {(isRtl ? report.interests.careerSuggestionsAr : report.interests.careerSuggestions).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0F4C75]">{t("report.overallProfile")}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
              {isRtl ? report.overallProfile.personalitySummaryAr : report.overallProfile.personalitySummary}
            </p>
            <h3 className="mt-4 font-semibold">{t("strengths")}</h3>
            <ul className="list-inside list-disc text-sm">
              {(isRtl ? report.overallProfile.keyStrengthsAr : report.overallProfile.keyStrengths).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0F4C75]">{t("report.jobFit")}</h2>
            <div className="mt-4 space-y-2">
              {Object.entries(report.jobFitScores).map(([cat, pct]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-28 text-sm font-medium">{cat}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#EEF2F7]">
                    <div className="h-full bg-[#0F4C75]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {report.topRecommendedRoles.slice(0, 5).map((role) => (
                <div key={role.role} className="rounded-lg border bg-white p-4">
                  <p className="font-semibold">
                    {isRtl ? role.roleAr : role.role} — {role.fitPercentage}%
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">{isRtl ? role.reasonAr : role.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-[#6B7280]">{t("report.generating")}</p>
      )}

      <section className="flex flex-wrap gap-4 rounded-xl border bg-white p-6">
        <a
          href={`/api/assessment/download-report?id=${encodeURIComponent(assessmentId)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0F4C75] px-6 text-sm font-semibold text-white"
        >
          {t("report.downloadPdf")}
        </a>
        <p className="w-full text-xs text-[#6B7280]">{t("autoSharedWithEmployers")}</p>
        <Link
          href="/dashboard/job-seeker/assessment"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border px-6 text-sm font-semibold text-[#0F4C75]"
        >
          {t("report.retake")}
        </Link>
      </section>
    </div>
  );
}
