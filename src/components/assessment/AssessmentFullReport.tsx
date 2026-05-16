"use client";

import { useTranslations } from "next-intl";
import { ASSESSMENT_PASS_SCORE, ASSESSMENT_STEPS } from "@/lib/assessment/steps";
import type { StepScoresMap } from "@/lib/assessment/step-scores";
import { stepKey } from "@/lib/assessment/step-scores";

type ReportData = {
  overallScore: number;
  passed: boolean;
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; tip: string }>;
  recommendations?: Array<{ type: string; title: string; description: string }>;
  stepScores: StepScoresMap;
  overallFeedback?: string;
};

export function AssessmentFullReport({ data }: { data: ReportData }) {
  const t = useTranslations("assessment");
  const color =
    data.overallScore >= 80
      ? "text-emerald-600 border-emerald-300"
      : data.overallScore >= ASSESSMENT_PASS_SCORE
        ? "text-amber-600 border-amber-300"
        : "text-red-600 border-red-300";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#0D2137]">{t("fullReportTitle")}</h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          {data.passed ? t("fullReportPassed") : t("fullReportFailed")}
        </p>
        <div
          className={`mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-full border-8 text-3xl font-black ${color}`}
        >
          {data.overallScore}
        </div>
        <p className="mt-2 text-sm font-medium text-[#6B7280]">{t("overallScoreLabel")}</p>
      </div>

      <section>
        <h3 className="font-bold text-[#0D2137]">{t("stepScoresTitle")}</h3>
        <div className="mt-4 space-y-3">
          {ASSESSMENT_STEPS.map((cfg) => {
            const entry = data.stepScores[stepKey(cfg.id)];
            const val = entry?.score ?? 0;
            return (
              <div key={cfg.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-[#374151]">
                    {t(`steps.step${cfg.id}.title` as never)}
                  </span>
                  <span className="font-semibold text-[#0D2137]">{entry ? `${val}/100` : "—"}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-gray-100">
                  <div className="h-2 rounded bg-brand-teal" style={{ width: `${val}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {data.overallFeedback ? (
        <p className="text-sm leading-relaxed text-[#374151]">{data.overallFeedback}</p>
      ) : null}

      <section>
        <h3 className="font-bold text-[#0D2137]">{t("strengths")}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {data.strengths.slice(0, 5).map((s) => (
            <li key={s.title}>
              ✅ {s.title}: {s.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-bold text-[#0D2137]">{t("improvements")}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {data.weaknesses.slice(0, 5).map((w) => (
            <li key={w.title}>
              ⚠️ {w.title}: {w.tip}
            </li>
          ))}
        </ul>
      </section>

      {data.recommendations?.length ? (
        <section>
          <h3 className="font-bold text-[#0D2137]">{t("recommendations")}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {data.recommendations.slice(0, 5).map((r) => (
              <li key={r.title}>
                {r.type}: {r.title} — {r.description}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
