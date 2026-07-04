"use client";

import { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Brain, MessageCircle, UserRound, Video } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import {
  applicationStatusBadgeVariant,
  applicationStatusTranslationKey,
} from "@/components/dashboard/applicationStatusUi";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { EmployerInsightsPayload } from "@/types/dashboard";
import { ApplicationStatus } from "@/types";

export default function EmployerInsightsClient({ title }: { title: string }) {
  const t = useTranslations("employerInsights");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [data, setData] = useState<EmployerInsightsPayload | null>(null);
  const [jobId, setJobId] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
    const res = await fetch(`/api/employer/insights${qs}`, { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: EmployerInsightsPayload };
    if (j.success && j.data) {
      setData(j.data);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
  }, [jobId]);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  if (loadFailed && !data) {
    return (
      <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={() => void refresh()} />
    );
  }

  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <p className="text-sm text-[#6B7280]">{t("subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label={t("statApplicants")}
          value={String(data.stats.totalApplicants)}
          Icon={UserRound}
          borderColor="#0F4C75"
        />
        <AdminStatCard
          label={t("statInterviewsDone")}
          value={String(data.stats.jobInterviewsCompleted)}
          Icon={Video}
          borderColor="#1D9E75"
        />
        <AdminStatCard
          label={t("statWithAssessment")}
          value={String(data.stats.withAssessment)}
          Icon={Brain}
          borderColor="#C9973A"
        />
        <AdminStatCard
          label={t("statAvgInterview")}
          value={
            data.stats.avgJobInterviewScore != null
              ? `${data.stats.avgJobInterviewScore}/100`
              : "—"
          }
          Icon={BarChart3}
          borderColor="#6B7280"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[#374151]" htmlFor="insights-job-filter">
          {t("filterJob")}
        </label>
        <select
          id="insights-job-filter"
          className="min-h-11 rounded-lg border px-3 py-2 text-sm"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
        >
          <option value="">{t("allJobs")}</option>
          {data.jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} ({job.applicantCount})
            </option>
          ))}
        </select>
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-xl border bg-white p-8 text-center text-sm text-[#6B7280]">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {data.items.map((row) => (
            <li
              key={row.applicationId}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <InitialsAvatar
                    name={row.candidateName}
                    email={row.candidateEmail}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-[#0D2137]">
                      {row.candidateName ?? t("anonymousCandidate")}
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      {row.contactHidden ? t("contactLocked") : row.candidateEmail}
                    </p>
                    <p className="mt-1 text-sm text-[#374151]">
                      {t("appliedFor")}: <span className="font-medium">{row.jobTitle}</span>
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {new Date(row.appliedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={applicationStatusBadgeVariant(row.applicationStatus as ApplicationStatus)}
                  size="sm"
                  className="w-fit capitalize"
                >
                  {td(applicationStatusTranslationKey(row.applicationStatus as ApplicationStatus) as never)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ScorePill
                  label={t("matchScore")}
                  value={row.matchScore != null ? `${row.matchScore}%` : "—"}
                />
                <ScorePill
                  label={t("assessmentScore")}
                  value={row.assessmentScore != null ? `${row.assessmentScore}/100` : t("notAvailable")}
                  warn={row.assessmentFlagged}
                />
                <ScorePill
                  label={t("jobInterviewScore")}
                  value={
                    row.jobInterviewCompleted && row.jobInterviewScore != null
                      ? `${row.jobInterviewScore}/100`
                      : row.jobInterviewStatus === "IN_PROGRESS" || row.jobInterviewStatus === "PENDING"
                        ? t("inProgress")
                        : t("notAvailable")
                  }
                  warn={row.jobInterviewFlagged}
                />
                <ScorePill
                  label={t("generalInterview")}
                  value={
                    row.generalInterviewScore != null
                      ? `${row.generalInterviewScore}/100`
                      : t("notAvailable")
                  }
                />
              </div>

              {row.aiSummary ? (
                <div className="mt-4 rounded-lg bg-[#F8FAFC] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    {t("aiReview")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#374151]">{row.aiSummary}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/employer/candidates/${row.applicationId}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0F4C75] px-4 text-sm font-semibold text-white hover:bg-[#0D2137]"
                >
                  {t("viewFullProfile")}
                </Link>
                <Link
                  href="/dashboard/employer/messages"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#0F4C75] px-4 text-sm font-semibold text-[#0F4C75] hover:bg-[#EFF6FF]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {t("messageCandidate")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScorePill({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${warn ? "border-amber-300 bg-amber-50" : "border-[#E5E7EB] bg-white"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#0D2137]">{value}</p>
    </div>
  );
}
