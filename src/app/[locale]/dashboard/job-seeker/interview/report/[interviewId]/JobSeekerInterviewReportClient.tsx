"use client";

import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { CandidateInterviewReportView } from "@/lib/interview/enhanced-report-types";

export function JobSeekerInterviewReportClient({ interviewId }: { interviewId: string }) {
  const t = useTranslations("jobSeekerInterviewReport");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [view, setView] = useState<CandidateInterviewReportView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      let res = await axios.get<{
        success: boolean;
        data: { candidateView: CandidateInterviewReportView | null; interviewId: string };
      }>(`/api/interview/report?interviewId=${encodeURIComponent(interviewId)}`);

      if (res.data.success && !res.data.data.candidateView) {
        await axios.post("/api/interview/generate-report", { interviewId }, { timeout: 120_000 });
        res = await axios.get(`/api/interview/report?interviewId=${encodeURIComponent(interviewId)}`);
      }

      if (!res.data.success || !res.data.data.candidateView) throw new Error("fail");
      setView(res.data.data.candidateView);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err || !view) {
    return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={() => void load()} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <Link href="/dashboard/job-seeker/interview" className="text-sm font-semibold text-brand-teal underline">
        {tc("back")}
      </Link>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#0D2137]">{t("title")}</h1>
        <p className="mt-2 text-3xl font-extrabold text-brand-teal">{view.overallScore}/100</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <p>{t("communication")}: {view.communicationScore}/100</p>
          <p>{t("content")}: {view.contentScore}/100</p>
          <p>{t("behavioral")}: {view.behavioralScore}/100</p>
          <p>{t("bodyLanguage")}: {view.bodyLanguageLabel}</p>
        </div>
      </section>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0F4C75]">{t("communicationFeedback")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#374151]">
          {isAr ? view.communicationFeedbackAR : view.communicationFeedbackEN}
        </p>
      </section>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0F4C75]">{t("contentFeedback")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#374151]">
          {isAr ? view.contentFeedbackAR : view.contentFeedbackEN}
        </p>
      </section>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0F4C75]">{t("improveTitle")}</h2>
        <ul className="mt-3 space-y-3">
          {view.improvements.map((imp) => (
            <li key={imp.title} className="rounded-lg bg-[#F9FAFB] p-3 text-sm">
              <p className="font-semibold">{isAr ? imp.titleAr : imp.title}</p>
              <p className="mt-1 text-[#6B7280]">{isAr ? imp.tipAr : imp.tip}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
