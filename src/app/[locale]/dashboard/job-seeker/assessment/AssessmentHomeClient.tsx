"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ASSESSMENT_PASS_SCORE, ASSESSMENT_STEPS } from "@/lib/assessment/steps";
import type { AssessmentProgressDto } from "@/app/api/assessment/progress/route";
import { AssessmentProgressSteps } from "@/components/assessment/AssessmentProgressSteps";
import { AssessmentFullReport } from "@/components/assessment/AssessmentFullReport";
import { parseStepScores } from "@/lib/assessment/step-scores";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { TalentPoolStatusBanner } from "@/components/dashboard/TalentPoolStatusBanner";

export default function AssessmentHomeClient() {
  const t = useTranslations("assessment");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const [progress, setProgress] = useState<AssessmentProgressDto | null>(null);
  const [detail, setDetail] = useState<{
    strengths: unknown;
    weaknesses: unknown;
    recommendations: unknown;
    stepScores?: unknown;
  } | null>(null);
  const [err, setErr] = useState(false);
  const [share, setShare] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/assessment/progress", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: AssessmentProgressDto };
    if (!res.ok || !j.success || !j.data) throw new Error("load");
    setProgress(j.data);
    setShare(j.data.shareWithEmployers);
    if (j.data.stepsCompleted >= 5 && j.data.assessmentId) {
      const d = await fetch(`/api/assessment/detail?id=${encodeURIComponent(j.data.assessmentId)}`, {
        credentials: "include",
      });
      const dj = (await d.json()) as { success?: boolean; data?: typeof detail };
      if (d.ok && dj.success && dj.data) setDetail(dj.data);
    }
  }, []);

  useEffect(() => {
    void load().catch(() => setErr(true));
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load().catch(() => undefined);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (!progress?.talentPool.proctoringSuspended) return;
    const id = window.setInterval(() => void load().catch(() => undefined), 60_000);
    return () => window.clearInterval(id);
  }, [progress?.talentPool.proctoringSuspended, load]);

  async function patchShare(next: boolean) {
    if (!progress?.assessmentId) return;
    await fetch("/api/assessment/share", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "assessment", id: progress.assessmentId, share: next }),
    });
    setShare(next);
  }

  if (err) {
    return <ErrorState title={tc("error")} retryLabel={tc("retry")} onRetry={() => window.location.reload()} />;
  }

  if (!progress) return <LoadingSpinner size="full" label={tc("loading")} />;

  const allDone = progress.stepsCompleted >= 5 && progress.overallScore != null;
  const stepScores =
    progress.stepScores && Object.keys(progress.stepScores).length > 0
      ? progress.stepScores
      : parseStepScores(detail?.stepScores);

  return (
    <div className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
      {progress.talentPool.inTalentPool || progress.talentPool.proctoringSuspended ? (
        <TalentPoolStatusBanner status={progress.talentPool} locale={locale} />
      ) : null}

      <header>
        <h1 className="text-2xl font-bold text-[#0D2137]">{t("title")}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">{t("subtitleFree")}</p>
        {progress.overallScore != null ? (
          <p className="mt-3 text-sm font-semibold text-brand-teal">
            {t("profileBadge", { score: progress.overallScore })}
            {progress.passed ? " ✅" : ""}
          </p>
        ) : null}
      </header>

      <AssessmentProgressSteps steps={progress.steps} />

      {allDone && detail && progress.overallScore != null ? (
        <div className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
          <AssessmentFullReport
            data={{
              overallScore: progress.overallScore,
              passed: progress.passed,
              stepScores,
              strengths: (Array.isArray(detail.strengths) ? detail.strengths : []) as Array<{
                title: string;
                description: string;
              }>,
              weaknesses: (Array.isArray(detail.weaknesses) ? detail.weaknesses : []) as Array<{
                title: string;
                tip: string;
              }>,
              recommendations: Array.isArray(detail.recommendations)
                ? (detail.recommendations as Array<{ type: string; title: string; description: string }>)
                : [],
            }}
          />
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => void patchShare(e.target.checked)}
            />
            {t("shareWithEmployers")}
          </label>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ASSESSMENT_STEPS.map((cfg) => {
          const row = progress.steps.find((s) => s.step === cfg.id);
          const status = row?.status ?? "not_started";
          const score = row?.score;
          const canStart =
            !progress.talentPool.proctoringSuspended &&
            (status === "not_started" ||
              status === "in_progress" ||
              (status === "completed" && row?.canRetake));
          const btnLabel =
            status === "completed" && row?.canRetake
              ? t("retake")
              : status === "in_progress"
                ? t("continue")
                : status === "completed"
                  ? t("viewStep")
                  : t("start");

          return (
            <article
              key={cfg.id}
              className="flex flex-col rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">
                {t("stepLabel", { n: cfg.id })}
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#0D2137]">
                {t(`steps.step${cfg.id}.title` as never)}
              </h2>
              <p className="mt-2 flex-1 text-sm text-[#6B7280]">
                {t(`steps.step${cfg.id}.desc` as never)}
              </p>
              <p className="mt-3 text-xs font-medium text-[#374151]">{t("stepDuration")}</p>
              <p className="mt-2 text-xs capitalize text-[#6B7280]">
                {status === "completed"
                  ? t("statusCompleted")
                  : status === "in_progress"
                    ? t("statusInProgress")
                    : t("statusNotStarted")}
              </p>
              {score != null ? (
                <p className="mt-2 text-sm font-semibold text-brand-teal">
                  {t("score")}: {score}/100
                  {score >= ASSESSMENT_PASS_SCORE ? " ✅" : ""}
                </p>
              ) : null}
              <div className="mt-4">
                {canStart ? (
                  <Link
                    href={`/dashboard/job-seeker/assessment/step/${cfg.id}${
                      status === "completed" && row?.canRetake ? "?retake=1" : ""
                    }`}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-teal px-4 text-sm font-semibold text-white"
                  >
                    {btnLabel}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#EEF2F7] px-4 text-sm text-[#6B7280]">
                    {t("stepDone")}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
