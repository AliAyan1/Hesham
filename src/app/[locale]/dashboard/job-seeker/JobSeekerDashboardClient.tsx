"use client";

import {
  Briefcase,
  Brain,
  ClipboardList,
  Crown,
  FileText,
  Headphones,
  Lock,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { JobSeekerDashboardPayload } from "@/types/dashboard";
import type { SubscriptionTier } from "@/types";
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

type MatchReco = {
  jobId: string;
  title: string;
  category: string;
  matchScore: number | null;
  reason: string | null;
  aiPowered: boolean;
};

export default function JobSeekerDashboardClient({ userName }: { userName: string }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tj = useTranslations("jobs");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [data, setData] = useState<JobSeekerDashboardPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reco, setReco] = useState<MatchReco[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/job-seeker", { credentials: "include" });
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const json = (await res.json()) as JobSeekerDashboardPayload;
        if (!cancelled) {
          setData(json);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !data) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/jobs/matches?limit=5", { credentials: "include" });
        if (!res.ok) return;
        const json: unknown = await res.json();
        if (
          cancelled ||
          !json ||
          typeof json !== "object" ||
          !("data" in json) ||
          typeof (json as { data: unknown }).data !== "object" ||
          !("items" in (json as { data: { items: unknown } }).data)
        ) {
          return;
        }
        const items = (json as { data: { items: MatchReco[] } }).data.items;
        if (!cancelled) setReco(Array.isArray(items) ? items : []);
      } catch {
        /* optional block */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, data]);

  function retry() {
    setStatus("loading");
    void fetch("/api/dashboard/job-seeker", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<JobSeekerDashboardPayload>;
      })
      .then((json) => {
        setData(json);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  if (status === "loading" && !data) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  if (status === "error" || !data) {
    return (
      <ErrorState title={t("dashboardLoadError")} onRetry={retry} retryLabel={tc("retry")} />
    );
  }

  const completion = data.profileCompletion;
  const tier = data.subscriptionTier as SubscriptionTier;
  const canAiAssessment = hasAccess(tier, "ai_assessment");
  const canJobMatchingAi = hasAccess(tier, "job_matching_ai");
  const canAtsScore = hasAccess(tier, "ats_score");
  const isPremium = tier === "PREMIUM";
  const assessed = data.assessmentScore != null;
  const statGap = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4";

  const secondaryBanner = canAiAssessment ? (
    <Link
      href="/dashboard/job-seeker/assessment"
      className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-white/80 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10"
    >
      {t("btnTakeAssessment")}
    </Link>
  ) : (
    <Link
      href="/pricing"
      className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-white/80 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10"
    >
      {t("btnViewPlans")}
    </Link>
  );

  const thirdStatValue = canJobMatchingAi ? data.jobMatchesCount : data.jobsAvailableCount;
  const thirdStatLabel = canJobMatchingAi ? t("jobMatches") : t("statJobsAvailable");
  const thirdStatFooter = canJobMatchingAi ? (
    <span className="font-medium text-[#C9973A]">{t("statFootnoteJobMatches")}</span>
  ) : (
    <span className="text-gray-500">{t("statFootnoteBrowsePool")}</span>
  );

  return (
    <div className="space-y-8">
      <DashboardWelcomeBanner
        eyebrow={t("jobSeekerEyebrow")}
        title={t("welcomeBannerGreeting", { name: userName })}
        subtitle={t("jobSeekerBannerSubtitle", { percent: String(completion) })}
        actions={
          <>
            <Link
              href="/dashboard/job-seeker/jobs"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 py-3 text-sm font-semibold text-white transition-[transform] duration-150 hover:brightness-105"
            >
              {t("btnBrowseJobs")}
            </Link>
            {secondaryBanner}
          </>
        }
      />

      <section className={statGap} aria-labelledby="js-stats">
        <h2 id="js-stats" className="sr-only">
          {t("profileCompletion")}
        </h2>
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#0F4C75]"
          iconBgClass="bg-[#EFF6FF]"
          iconColorClass="text-[#0F4C75]"
          Icon={UserRound}
          value={`${completion}%`}
          label={t("profileCompletion")}
          footer={
            <span className={cn(completion < 80 ? "font-medium text-orange-600" : "text-brand-teal")}>
              {t("profileCompletionLabel", { percent: String(completion) })}
            </span>
          }
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#1D9E75]"
          iconBgClass="bg-[#E1F5EE]"
          iconColorClass="text-[#1D9E75]"
          Icon={ClipboardList}
          value={data.applicationsCount}
          label={t("statTotalApplications")}
          footer={<span className="text-gray-500">{t("recentApplicationsSubtitle")}</span>}
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#C9973A]"
          iconBgClass="bg-[#FDF3E3]"
          iconColorClass="text-[#C9973A]"
          Icon={Briefcase}
          value={thirdStatValue}
          label={thirdStatLabel}
          footer={thirdStatFooter}
        />
        {canAiAssessment ? (
          <PremiumStatCard
            borderClass="border-s-4 border-s-[#7C3AED]"
            iconBgClass="bg-[#F5F3FF]"
            iconColorClass="text-[#7C3AED]"
            Icon={Brain}
            valueClassName={
              assessed
                ? "flex flex-wrap items-baseline gap-1 text-[48px]"
                : "!text-3xl font-extrabold"
            }
            value={
              assessed ? (
                <>
                  <span>{data.assessmentScore}</span>
                  <span className="text-2xl font-bold text-gray-500">/100</span>
                </>
              ) : (
                t("notTakenYet")
              )
            }
            label={t("assessmentScore")}
            footer={
              assessed ? null : (
                <Link
                  href="/dashboard/job-seeker/assessment"
                  className="font-semibold text-brand-teal hover:underline"
                >
                  {t("takeAssessmentNow")}
                </Link>
              )
            }
          />
        ) : (
          <article
            className={cn(
              "relative flex flex-col gap-4 overflow-hidden rounded-[12px] border-2 border-[#C9973A] bg-gradient-to-br from-[#FFFBEB] to-white p-6 shadow-md",
              "transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md",
            )}
            aria-labelledby="upgrade-ai-heading"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF7D6]" aria-hidden>
                <Lock className="h-6 w-6 text-[#B8860F]" strokeWidth={2} />
              </div>
              <Badge size="sm" className="bg-[#FFF7D6] font-semibold text-[#92400E] ring-1 ring-[#FCD34D]">
                {tj("aiMatch")}
              </Badge>
            </div>
            <div className="min-h-[3rem] space-y-2">
              <h3 id="upgrade-ai-heading" className="text-lg font-bold leading-tight text-[#0D2137]">
                {t("upgradeAiStatTitle")}
              </h3>
              <p className="text-sm text-[#6B7280]">{t("upgradeAiStatBody")}</p>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center rounded-lg bg-[#0F4C75] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95"
              >
                {t("upgradeAiStatCta")}
              </Link>
            </div>
          </article>
        )}
      </section>

      {canAtsScore && data.atsScore != null ? (
        <section
          aria-labelledby="js-ats"
          className="rounded-[12px] border border-[#E1F5EE] bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 id="js-ats" className="text-lg font-semibold text-[#0D2137]">
                {t("atsCardTitle")}
              </h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                {t("atsCardSubtitle", { score: String(data.atsScore) })}
              </p>
            </div>
            <Link
              href="/dashboard/job-seeker/cv-builder"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105"
            >
              {t("atsCardImprove")}
            </Link>
          </div>
        </section>
      ) : null}

      {isPremium ? (
        <section
          aria-labelledby="premium-extras-heading"
          className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-6"
        >
          <div className="flex flex-wrap items-start gap-4">
            <Crown className="h-8 w-8 shrink-0 text-[#B8860F]" aria-hidden />
            <div className="min-w-0 flex-1 space-y-3">
              <h3 id="premium-extras-heading" className="text-lg font-bold text-[#0D2137]">
                {t("premiumStripeTitle")}
              </h3>
              <ul className="grid gap-2 text-sm text-[#4B5563] sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-teal" aria-hidden />
                  {t("premiumMentorHint")}
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-brand-teal" aria-hidden />
                  {t("premiumHrHint")}
                </li>
              </ul>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-lg border border-[#D97706] bg-white px-4 py-2 text-sm font-semibold text-[#92400E] hover:bg-[#FFF7ED]"
              >
                {t("premiumSupportCta")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="js-quick" className="space-y-5">
        <div>
          <h3 id="js-quick" className="text-xl font-semibold text-[#0D2137]">
            {t("quickActionsTitle")}
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">{t("sectionQuickActionsSubtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardActionCard
            href="/dashboard/job-seeker/profile"
            title={t("actionCompleteProfile")}
            description={t("quickActionCompleteProfileDesc")}
            iconBgClass="bg-[#EFF6FF]"
            iconColorClass="text-[#0F4C75]"
            Icon={UserRound}
          />
          <DashboardActionCard
            href="/dashboard/job-seeker/jobs"
            title={t("actionBrowseJobs")}
            description={t("quickActionBrowseJobsDesc")}
            iconBgClass="bg-[#E1F5EE]"
            iconColorClass="text-brand-teal"
            Icon={Briefcase}
          />
          <DashboardActionCard
            href="/dashboard/job-seeker/assessment"
            title={t("actionAssessment")}
            description={t("quickActionAssessmentDesc")}
            iconBgClass="bg-[#FDF3E3]"
            iconColorClass="text-[#C9973A]"
            Icon={Sparkles}
            locked={!canAiAssessment}
          />
          <DashboardActionCard
            href="/dashboard/job-seeker/cv-builder"
            title={canAtsScore ? t("actionCvBuilderAts") : t("actionUploadCv")}
            description={t("quickActionUploadCvDesc")}
            iconBgClass="bg-[#F5F3FF]"
            iconColorClass="text-[#7C3AED]"
            Icon={FileText}
          />
        </div>
      </section>

      {reco.length > 0 ? (
        <section aria-labelledby="js-reco-heading" className="space-y-4">
          <div>
            <h3 id="js-reco-heading" className="text-xl font-semibold text-[#0D2137]">
              {t("recommendedJobsTitle")}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">{t("recommendedJobsSubtitle")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reco.map((r) => (
              <article
                key={r.jobId}
                className="flex flex-col rounded-xl border border-[#F1F5F9] bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge size="sm" variant="neutral" className="font-medium">
                    {r.category}
                  </Badge>
                  {r.aiPowered && r.matchScore != null ? (
                    <Badge size="sm" className="bg-[#CCFBF1] font-semibold text-[#115E59]">
                      {tj("aiMatch")} {r.matchScore}%
                    </Badge>
                  ) : canJobMatchingAi ? (
                    <Badge size="sm" className="bg-gray-100 font-medium text-gray-600">
                      {tj("matchScore")}
                    </Badge>
                  ) : (
                    <Badge size="sm" variant="neutral" className="font-semibold">
                      {t("recommendedBasicBadge")}
                    </Badge>
                  )}
                </div>
                <h4 className="text-base font-bold text-[#0D2137]">{r.title}</h4>
                {r.reason ? <p className="mt-2 line-clamp-3 text-xs text-[#6B7280]">{r.reason}</p> : null}
                <div className="mt-auto pt-4">
                  <Link
                    href={`/dashboard/job-seeker/jobs/${r.jobId}`}
                    className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-teal hover:underline"
                  >
                    {tj("apply")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="js-applications" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="js-applications" className="text-xl font-semibold text-[#0D2137]">
              {t("recentApplicationsTitle")}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">{t("sectionRecentSubtitle")}</p>
          </div>
          <Link
            href="/dashboard/job-seeker/applications"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-teal hover:underline"
          >
            {t("viewAllApplicationsArrow")} →
          </Link>
        </div>

        {data.recentApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-gray-200 bg-white px-8 py-14 text-center shadow-sm">
            <ClipboardList className="mb-4 h-14 w-14 text-brand-teal" aria-hidden />
            <p className="text-lg font-bold text-[#0D2137]">{t("emptyApplicationsTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-[#6B7280]">{t("browseJobsPrompt")}</p>
            <button
              type="button"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-95"
              onClick={() => router.push("/dashboard/job-seeker/jobs")}
            >
              {t("actionBrowseJobs")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-[#F1F5F9] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-start text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                    {t("tableCandidateOrCompanyCol")}
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
                {data.recentApplications.map((row) => {
                  const companyLine = row.company ?? tc("emDash");
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F8FAFC]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={row.company} email={row.jobTitle || "application"} />
                          <p className="min-w-0 font-semibold text-[#0D2137]">{companyLine}</p>
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
                        <Badge
                          variant={applicationStatusBadgeVariant(row.status)}
                          size="sm"
                          className="font-medium"
                        >
                          {t(applicationStatusTranslationKey(row.status) as never)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href="/dashboard/job-seeker/applications"
                          className="inline-flex min-h-11 items-center rounded-lg border border-brand-teal px-3 py-2 text-xs font-semibold text-brand-teal transition-colors duration-150 hover:bg-brand-lightTeal"
                        >
                          {t("actionView")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
