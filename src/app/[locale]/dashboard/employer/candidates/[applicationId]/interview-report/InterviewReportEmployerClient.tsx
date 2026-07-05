"use client";

import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { EnhancedInterviewReport, HiringRecommendation } from "@/lib/interview/enhanced-report-types";
import { cn } from "@/lib/cn";
import { ApplicationStatus } from "@/types";

function recommendationStyles(rec: HiringRecommendation): string {
  switch (rec) {
    case "STRONGLY_RECOMMEND":
      return "bg-emerald-800 text-white";
    case "RECOMMEND":
      return "bg-brand-teal text-white";
    case "NEUTRAL":
      return "bg-gray-200 text-gray-800";
    case "NOT_RECOMMEND":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-red-100 text-red-900";
  }
}

function ScoreCircle({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return (
    <div className="flex flex-col items-center rounded-xl border border-[#EEF2F7] bg-white p-4 shadow-sm">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-brand-teal text-lg font-bold text-[#0F4C75]"
        style={{ borderColor: pct >= 70 ? "#1D9E75" : pct >= 50 ? "#C9973A" : "#EF4444" }}
      >
        {score}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-[#6B7280]">{label}</p>
    </div>
  );
}

function BarScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#374151]">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EEF2F7]">
        <div className="h-full rounded-full bg-brand-teal" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

export function InterviewReportEmployerClient({ applicationId }: { applicationId: string }) {
  const t = useTranslations("employerInterviewReport");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<EnhancedInterviewReport | null>(null);
  const [meta, setMeta] = useState<{
    interviewId: string;
    candidateName: string;
    jobTitle: string;
    completedAt: string | null;
  } | null>(null);
  const [openQ, setOpenQ] = useState<number | null>(1);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{
        success: boolean;
        data: {
          interviewId: string;
          candidateName: string;
          jobTitle: string;
          completedAt: string | null;
          report: EnhancedInterviewReport | null;
        };
      }>(`/api/interview/report?applicationId=${encodeURIComponent(applicationId)}`);

      if (!res.data.success) throw new Error("fail");
      setMeta({
        interviewId: res.data.data.interviewId,
        candidateName: res.data.data.candidateName,
        jobTitle: res.data.data.jobTitle,
        completedAt: res.data.data.completedAt,
      });

      if (res.data.data.report) {
        setReport(res.data.data.report);
      } else if (res.data.data.interviewId) {
        setGenerating(true);
        const gen = await axios.post<{ success: boolean; data: { report: EnhancedInterviewReport } }>(
          "/api/interview/generate-report",
          { interviewId: res.data.data.interviewId },
          { timeout: 120_000 },
        );
        if (gen.data.success && gen.data.data.report) {
          setReport(gen.data.data.report);
        } else {
          throw new Error("gen");
        }
        setGenerating(false);
      }
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(status: ApplicationStatus) {
    await axios.patch(`/api/employer/applications/${applicationId}`, { status });
  }

  if (loading || generating) {
    return (
      <LoadingSpinner
        size="full"
        label={generating ? t("generatingReport") : tc("loading")}
      />
    );
  }
  if (err || !report || !meta) {
    return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={() => void load()} />;
  }

  const rec = report.executiveSummary.hiringRecommendation.replace(/_/g, " ");
  const summary = isAr ? report.executiveSummary.summaryAR : report.executiveSummary.summaryEN;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/employer/candidates/${applicationId}`}
          className="text-sm font-semibold text-brand-teal underline"
        >
          {t("backToProfile")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/interview/report/pdf?interviewId=${encodeURIComponent(meta.interviewId)}&locale=en`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-4 text-sm font-semibold text-[#0F4C75] hover:bg-gray-50"
            download
          >
            {t("downloadEn")}
          </a>
          <a
            href={`/api/interview/report/pdf?interviewId=${encodeURIComponent(meta.interviewId)}&locale=ar`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-4 text-sm font-semibold text-[#0F4C75] hover:bg-gray-50"
            download
          >
            {t("downloadAr")}
          </a>
        </div>
      </div>

      {/* Section 1 — Executive Summary */}
      <section className="rounded-2xl border border-brand-teal/20 bg-gradient-to-br from-white to-brand-lightTeal/20 p-6 shadow-sm">
        <p className="text-sm text-[#6B7280]">{meta.jobTitle}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0D2137]">{meta.candidateName}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#0F4C75] text-3xl font-extrabold text-white">
            {report.executiveSummary.overallRating}
            <span className="text-lg font-normal opacity-80">/10</span>
          </div>
          <span className={cn("rounded-full px-4 py-2 text-sm font-bold", recommendationStyles(report.executiveSummary.hiringRecommendation))}>
            {rec}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#374151]">{summary}</p>
      </section>

      {/* Section 2 — Score cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ScoreCircle label={t("scoreComm")} score={report.communicationAnalysis.score} />
        <ScoreCircle label={t("scoreContent")} score={report.contentAnalysis.score} />
        <ScoreCircle label={t("scoreBehavioral")} score={report.behavioralAnalysis.score} />
        <ScoreCircle label={t("scoreFacial")} score={report.facialExpressionAnalysis.overallConfidenceScore} />
        <ScoreCircle label={t("scoreFit")} score={report.roleCompatibility.overallFit} />
        <ScoreCircle label={t("scoreOverall")} score={report.executiveSummary.overallRating} />
      </div>

      {/* Section 3 — Communication */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F4C75]">{t("communicationTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BarScore label={t("clarity")} value={report.communicationAnalysis.clarity ?? report.communicationAnalysis.score} />
          <BarScore label={t("articulation")} value={report.communicationAnalysis.articulation ?? report.communicationAnalysis.score} />
          <BarScore label={t("vocabulary")} value={report.communicationAnalysis.vocabulary ?? report.communicationAnalysis.score} />
          <BarScore label={t("relevance")} value={report.communicationAnalysis.responseRelevance ?? report.communicationAnalysis.score} />
        </div>
        <ul className="mt-4 space-y-1 text-sm text-emerald-800">
          {(report.communicationAnalysis.strengths ?? []).map((s) => (
            <li key={s}>✓ {s}</li>
          ))}
        </ul>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          {(report.communicationAnalysis.weaknesses ?? []).map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-[#374151]">
          {isAr ? report.communicationAnalysis.detailAR : report.communicationAnalysis.detailEN}
        </p>
      </section>

      {/* Section 4 — Facial */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F4C75]">{t("facialTitle")}</h2>
        <p className="text-xs text-[#6B7280]">{t("facialSubtitle")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreCircle label={t("confidence")} score={report.facialExpressionAnalysis.overallConfidenceScore} />
          <ScoreCircle label={t("stress")} score={report.facialExpressionAnalysis.averageStressLevel} />
          <ScoreCircle label={t("engagement")} score={report.facialExpressionAnalysis.engagementLevel} />
          <ScoreCircle label={t("authenticity")} score={report.facialExpressionAnalysis.authenticityScore} />
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {report.facialExpressionAnalysis.emotionTimeline.map((phase) => (
            <div key={phase.phase} className="min-w-[140px] flex-1 rounded-lg border border-[#EEF2F7] p-3">
              <p className="text-xs font-bold uppercase text-brand-teal">{phase.phase}</p>
              <p className="mt-1 font-semibold text-[#0D2137]">{phase.dominantEmotion}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{phase.interpretation}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[#374151]">{report.facialExpressionAnalysis.eyeContactAssessment}</p>
        <p className="mt-2 text-sm text-[#374151]">{report.facialExpressionAnalysis.postureAssessment}</p>
        <ul className="mt-3 list-inside list-disc text-sm text-[#374151]">
          {report.facialExpressionAnalysis.notableObservations.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-[#374151]">
          {isAr ? report.facialExpressionAnalysis.facialSummaryAR : report.facialExpressionAnalysis.facialSummaryEN}
        </p>
      </section>

      {/* Section 5 — Q by Q */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F4C75]">{t("questionBreakdown")}</h2>
        <ul className="mt-4 space-y-2">
          {report.questionByQuestionAnalysis.map((q) => (
            <li key={q.questionNumber} className="rounded-lg border border-[#EEF2F7]">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-start text-sm font-semibold text-[#0D2137]"
                onClick={() => setOpenQ(openQ === q.questionNumber ? null : q.questionNumber)}
              >
                <span>Q{q.questionNumber}: {q.questionText.slice(0, 80)}{q.questionText.length > 80 ? "…" : ""}</span>
                <span className="text-brand-teal">{q.answerQuality}/10</span>
              </button>
              {openQ === q.questionNumber ? (
                <div className="border-t px-4 py-3 text-sm text-[#374151]">
                  <p className="font-medium text-emerald-800">{t("keyPoints")}</p>
                  <ul className="list-inside list-disc">
                    {q.keyPoints.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                  <p className="mt-2 font-medium text-amber-800">{t("missed")}</p>
                  <ul className="list-inside list-disc">
                    {q.missedOpportunities.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[#6B7280]">{q.facialDuringAnswer}</p>
                  <p className="mt-2">{isAr ? q.feedbackAR : q.feedbackEN}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 6 — Strengths & Development */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
          <h2 className="font-bold text-emerald-900">{t("topStrengths")}</h2>
          <ul className="mt-3 space-y-3">
            {report.strengthsAndWeaknesses.topStrengths.map((s) => (
              <li key={s.strength} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                <p className="font-semibold text-[#0D2137]">{s.strength}</p>
                <p className="mt-1 text-[#6B7280]">{s.evidence}</p>
                <p className="mt-1 text-xs text-brand-teal">{t("roleRelevance")}: {s.relevanceToRole}/10</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-orange-100 bg-orange-50/50 p-6">
          <h2 className="font-bold text-orange-900">{t("developmentAreas")}</h2>
          <ul className="mt-3 space-y-3">
            {report.strengthsAndWeaknesses.developmentAreas.map((d) => (
              <li key={d.area} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                <p className="font-semibold text-[#0D2137]">{d.area}</p>
                <p className="mt-1 text-[#6B7280]">{d.observation}</p>
                <p className="mt-1 text-xs text-[#854D0E]">{d.recommendation}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Section 7 — Hiring notes */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F4C75]">{t("hiringNotes")}</h2>
        <ol className="mt-3 list-inside list-decimal text-sm text-[#374151]">
          {report.hiringManagerNotes.suggestedFollowUpQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm font-medium text-[#0D2137]">{t("areasExplore")}</p>
        <ul className="list-inside list-disc text-sm text-[#374151]">
          {report.hiringManagerNotes.areasToExploreMore.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[#6B7280]">{report.hiringManagerNotes.salaryBenchmark}</p>
        <p className="mt-4 text-base font-semibold leading-relaxed text-[#0D2137]">
          {isAr ? report.hiringManagerNotes.finalRecommendationAR : report.hiringManagerNotes.finalRecommendationEN}
        </p>
      </section>

      {/* Section 8 — Actions */}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void patchStatus(ApplicationStatus.SHORTLISTED)}>
          {t("shortlist")}
        </Button>
        <Link
          href={`/dashboard/employer/candidates/${applicationId}`}
          className="inline-flex min-h-10 items-center rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {t("decline")}
        </Link>
        <Link
          href={`/dashboard/employer/messages?applicationId=${applicationId}`}
          className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] hover:bg-gray-50"
        >
          {t("scheduleFollowUp")}
        </Link>
      </div>
    </div>
  );
}
