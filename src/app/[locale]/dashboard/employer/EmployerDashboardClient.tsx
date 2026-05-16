"use client";

import { BarChart3, Brain, Briefcase, ClipboardList, FileText, Sparkles, Star, Video } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { EmployerDashboardPayload } from "@/types/dashboard";
import type { SubscriptionTier } from "@/types";
import { signOut } from "next-auth/react";
import { EmployerHiringStarter } from "@/components/dashboard/EmployerHiringStarter";
import { ApplicationScoreBadge } from "@/components/dashboard/ApplicationScoreBadge";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";
import { DashboardWelcomeBanner } from "@/components/dashboard/DashboardWelcomeBanner";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import {
  applicationStatusBadgeVariant,
  applicationStatusTranslationKey,
} from "@/components/dashboard/applicationStatusUi";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/cn";
import { hasAccess } from "@/lib/subscription";

export default function EmployerDashboardClient({
  userName,
  subscriptionTier,
  canAiJobDescription,
}: {
  userName: string;
  subscriptionTier: SubscriptionTier;
  canAiJobDescription: boolean;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const locale = useLocale();
  const [data, setData] = useState<EmployerDashboardPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const canEmployerAnalytics = hasAccess(subscriptionTier, "employer_analytics");

  const loadEmployerDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employer", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        if (res.status === 401) {
          void signOut({ callbackUrl: `/${locale}/auth/login` });
        }
        setStatus("error");
        return;
      }
      const json = (await res.json()) as EmployerDashboardPayload | null;
      if (
        !json ||
        typeof json !== "object" ||
        typeof (json as { activeJobsCount?: unknown }).activeJobsCount !== "number"
      ) {
        setStatus("error");
        return;
      }
      const normalized: EmployerDashboardPayload = {
        ...json,
        aiInterviewsTotal: typeof json.aiInterviewsTotal === "number" ? json.aiInterviewsTotal : 0,
        aiInterviewsPendingReview:
          typeof json.aiInterviewsPendingReview === "number" ? json.aiInterviewsPendingReview : 0,
      };
      setData(normalized);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [locale]);

  useEffect(() => {
    void loadEmployerDashboard();
  }, [loadEmployerDashboard]);

  function retry() {
    setStatus("loading");
    void loadEmployerDashboard();
  }

  const hiringStarter = (
    <EmployerHiringStarter
      tier={subscriptionTier}
      canAiJobDescription={canAiJobDescription}
    />
  );

  if (status === "loading" && !data) {
    return (
      <div className="space-y-8">
        {hiringStarter}
        <DashboardWelcomeBanner
          eyebrow={t("employerEyebrow")}
          title={t("welcomeBannerGreeting", { name: userName })}
          subtitle={t("employerLoadingStatsSubtitle")}
          actions={
            <Link
              href="/dashboard/employer/post-job"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 py-3 text-sm font-semibold text-white transition-[transform,box-shadow] duration-150 hover:brightness-105"
            >
              {t("btnPostJob")}
            </Link>
          }
        />
        <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-[#FAFAFA] px-6 py-10">
          <LoadingSpinner size="md" />
          <p className="text-sm font-medium text-[#6B7280]">{t("employerLoadingStats")}</p>
        </div>
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="space-y-8">
        {hiringStarter}
        <ErrorState title={t("dashboardLoadError")} onRetry={retry} retryLabel={tc("retry")} />
      </div>
    );
  }

  const statGap = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="space-y-8">
      {hiringStarter}
      <DashboardWelcomeBanner
        eyebrow={t("employerEyebrow")}
        title={t("welcomeBannerGreeting", { name: userName })}
        subtitle={t("employerBannerSubtitle", { count: String(data.applicationsTodayCount) })}
        actions={
          <>
            <Link
              href="/dashboard/employer/post-job"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 py-3 text-sm font-semibold text-white transition-[transform,box-shadow] duration-150 hover:brightness-105"
            >
              {t("btnPostJob")}
            </Link>
            <Link
              href="/dashboard/employer/candidates"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-white/80 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10"
            >
              {t("btnViewCandidates")}
            </Link>
          </>
        }
      />

      <section aria-labelledby="employer-stats-heading" className={statGap}>
        <h2 id="employer-stats-heading" className="sr-only">
          {t("totalJobs")}
        </h2>
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#0F4C75]"
          iconBgClass="bg-[#EFF6FF]"
          iconColorClass="text-[#0F4C75]"
          Icon={Briefcase}
          value={data.activeJobsCount}
          label={t("activeJobsPosted")}
          footer={
            <span
              className={cn(
                data.jobsExpiringSoonCount > 0 ? "font-medium text-orange-600" : "text-gray-500",
              )}
            >
              {data.jobsExpiringSoonCount > 0
                ? t("statFootnoteJobsExpiring", {
                    count: String(data.jobsExpiringSoonCount),
                  })
                : t("statFootnoteJobsHealthy")}
            </span>
          }
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#1D9E75]"
          iconBgClass="bg-[#E1F5EE]"
          iconColorClass="text-[#1D9E75]"
          Icon={FileText}
          value={data.totalApplicationsCount}
          label={t("applicationsReceived")}
          footer={
            <span
              className={cn(data.applicationsTodayCount > 0 ? "font-medium text-brand-teal" : "text-gray-500")}
            >
              {data.applicationsTodayCount > 0
                ? t("statFootnoteApplicationsToday", {
                    count: String(data.applicationsTodayCount),
                  })
                : t("statFootnoteApplicationsQuiet")}
            </span>
          }
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#C9973A]"
          iconBgClass="bg-[#FDF3E3]"
          iconColorClass="text-[#C9973A]"
          Icon={Star}
          value={data.shortlistedCount}
          label={t("candidatesShortlisted")}
          footer={
            <span className="font-medium text-[#C9973A]">
              {t("statFootnoteShortlisted", {
                count: String(data.pendingReviewCount),
              })}
            </span>
          }
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#7C3AED]"
          iconBgClass="bg-[#F5F3FF]"
          iconColorClass="text-[#7C3AED]"
          Icon={Video}
          value={data.aiInterviewsTotal}
          label={t("statAiInterviewsTitle")}
          footer={
            <span
              className={cn(
                data.aiInterviewsPendingReview > 0 ? "font-medium text-[#7C3AED]" : "text-gray-500",
              )}
            >
              {data.aiInterviewsPendingReview > 0
                ? t("statFootnoteAiInterviewsPending", {
                    count: String(data.aiInterviewsPendingReview),
                  })
                : t("statFootnoteAiInterviewsNone")}
            </span>
          }
        />
      </section>

      <section aria-labelledby="employer-ai-insights" className={statGap}>
        <h2 id="employer-ai-insights" className="sr-only">
          {t("statCandidatesWithAssessment")}
        </h2>
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#6366F1]"
          iconBgClass="bg-[#EEF2FF]"
          iconColorClass="text-[#4338CA]"
          Icon={Brain}
          value={data.candidatesWithSharedAssessment}
          label={t("statCandidatesWithAssessment")}
          footer={<span className="text-gray-500">{t("statFootnoteSharedAssessment")}</span>}
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#0D9488]"
          iconBgClass="bg-[#CCFBF1]"
          iconColorClass="text-[#0F766E]"
          Icon={Video}
          value={data.applicantsWithSharedInterview}
          label={t("statApplicantsInterviewed")}
          footer={<span className="text-gray-500">{t("statFootnoteSharedInterview")}</span>}
        />
      </section>

      <section aria-labelledby="employer-quick-actions" className="space-y-5">
        <div>
          <h3 id="employer-quick-actions" className="text-xl font-semibold text-[#0D2137]">
            {t("quickActionsTitle")}
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">{t("sectionQuickActionsSubtitle")}</p>
        </div>
        <div
          className={cn(
            "grid grid-cols-1 gap-5 sm:grid-cols-2",
            canEmployerAnalytics ? "xl:grid-cols-5" : "xl:grid-cols-4",
          )}
        >
          <DashboardActionCard
            href="/dashboard/employer/post-job"
            title={t("actionPostJob")}
            description={t("quickActionPostJobDesc")}
            iconBgClass="bg-[#EFF6FF]"
            iconColorClass="text-[#0F4C75]"
            Icon={Briefcase}
          />
          <DashboardActionCard
            href="/dashboard/employer/candidates"
            title={t("actionViewCandidates")}
            description={t("quickActionCandidatesDesc")}
            iconBgClass="bg-[#E1F5EE]"
            iconColorClass="text-brand-teal"
            Icon={FileText}
          />
          <DashboardActionCard
            href="/dashboard/employer/interviews/create"
            title={t("actionDesignAiInterview")}
            description={t("quickActionDesignAiInterviewDesc")}
            iconBgClass="bg-[#F5F3FF]"
            iconColorClass="text-[#7C3AED]"
            Icon={Sparkles}
          />
          <DashboardActionCard
            href="/dashboard/employer/jobs"
            title={t("actionManageJobs")}
            description={t("quickActionManageJobsDesc")}
            iconBgClass="bg-[#EDE9FE]"
            iconColorClass="text-[#6D28D9]"
            Icon={ClipboardList}
          />
          {canEmployerAnalytics ? (
            <DashboardActionCard
              href="/dashboard/employer/analytics"
              title={t("actionViewAnalytics")}
              description={t("quickActionAnalyticsDesc")}
              iconBgClass="bg-[#FDF3E3]"
              iconColorClass="text-[#C9973A]"
              Icon={BarChart3}
            />
          ) : null}
        </div>
      </section>

      <section aria-labelledby="recent-applications-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="recent-applications-heading" className="text-xl font-semibold text-[#0D2137]">
              {t("recentApplicationsTitle")}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">{t("sectionRecentSubtitle")}</p>
          </div>
          <Link
            href="/dashboard/employer/candidates"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-teal hover:underline"
          >
            {t("viewAllApplicationsArrow")} →
          </Link>
        </div>

        {data.recentApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-gray-200 bg-white px-8 py-14 text-center shadow-sm">
            <ClipboardList className="mb-4 h-14 w-14 text-brand-teal" aria-hidden />
            <p className="text-lg font-bold text-[#0D2137]">{t("emptyApplicationsTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-[#6B7280]">{t("emptyEmployerApplicationsBody")}</p>
            <Link
              href="/dashboard/employer/post-job"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white transition-[transform,opacity] duration-150 hover:opacity-95"
            >
              {t("emptyEmployerApplicationsCta")}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-[#F1F5F9] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-start text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("candidateCol")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("jobTitleCol")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("dateAppliedCol")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("scoreCol")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("statusCol")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("actionView")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentApplications.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F8FAFC]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={row.candidateName} email={row.candidateEmail} />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0D2137]">
                            {row.candidateName ?? row.candidateEmail}
                          </p>
                          <p className="text-xs text-[#6B7280]">{row.candidateEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-[#0D2137]">{row.jobTitle}</td>
                    <td className="px-4 py-4 text-[#6B7280]">
                      {format.dateTime(new Date(row.createdAt), { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationScoreBadge score={row.matchScore} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={applicationStatusBadgeVariant(row.status)} size="sm" className="font-medium">
                        {t(applicationStatusTranslationKey(row.status) as "applicationStatusPENDING")}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href="/dashboard/employer/candidates"
                        className="inline-flex min-h-11 items-center rounded-lg border border-brand-teal px-3 py-2 text-xs font-semibold text-brand-teal transition-colors duration-150 hover:bg-brand-lightTeal"
                      >
                        {t("actionView")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
