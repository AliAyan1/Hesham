"use client";

import { useTranslations } from "next-intl";
import { ASSESSMENT_STEPS } from "@/lib/assessment/steps";

type StepState = {
  step: number;
  status: "completed" | "in_progress" | "not_started";
  score: number | null;
};

export function AssessmentProgressSteps({ steps }: { steps: StepState[] }) {
  const t = useTranslations("assessment");

  return (
    <nav aria-label={t("stepsProgressAria")} className="overflow-x-auto pb-2">
      <ol className="flex min-w-[640px] gap-2">
        {ASSESSMENT_STEPS.map((cfg) => {
          const row = steps.find((s) => s.step === cfg.id);
          const status = row?.status ?? "not_started";
          const score = row?.score;
          const icon =
            status === "completed" ? "✅" : status === "in_progress" ? "🔄" : "○";
          const color =
            status === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : status === "in_progress"
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-[#EEF2F7] bg-white text-[#6B7280]";

          return (
            <li
              key={cfg.id}
              className={`flex min-w-0 flex-1 flex-col rounded-lg border px-2 py-2 text-center text-xs ${color}`}
            >
              <span className="text-base" aria-hidden>
                {icon}
              </span>
              <span className="mt-1 font-semibold leading-tight">
                {t(`steps.step${cfg.id}.title` as never)}
              </span>
              {score != null ? (
                <span className="mt-0.5 font-bold">{score}/100</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
