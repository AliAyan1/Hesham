"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import {
  Brain,
  Briefcase,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/cn";
import type { ShortlistEntry, ShortlistMatchTier, ShortlistPayload } from "@/lib/jobs/shortlist-types";

type Payload = ShortlistPayload & { needsRefresh?: boolean };

function tierStyles(tier: ShortlistMatchTier): { badge: string; border: string; label: string } {
  switch (tier) {
    case "top":
      return {
        badge: "bg-emerald-100 text-emerald-900",
        border: "border-emerald-200 ring-1 ring-emerald-100",
        label: "Top match",
      };
    case "recommended":
      return {
        badge: "bg-[#CCFBF1] text-[#115E59]",
        border: "border-brand-teal/30 ring-1 ring-brand-teal/10",
        label: "Recommended",
      };
    case "partial":
      return {
        badge: "bg-amber-100 text-amber-900",
        border: "border-amber-200",
        label: "Partial match",
      };
    default:
      return {
        badge: "bg-gray-100 text-gray-700",
        border: "border-gray-200",
        label: "Weak match",
      };
  }
}

export function JobShortlistClient({ jobId }: { jobId: string }) {
  const t = useTranslations("employerShortlist");
  const tc = useTranslations("common");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState(false);
  const autoRan = useRef(false);

  const runAiShortlist = useCallback(async () => {
    setAnalyzing(true);
    setErr(false);
    try {
      const res = await axios.post<{ success: boolean; data: Payload }>(
        `/api/employer/jobs/${encodeURIComponent(jobId)}/shortlist`,
        {},
        { timeout: 120_000 },
      );
      if (!res.data?.success || !res.data.data) throw new Error("failed");
      setData(res.data.data);
    } catch {
      setErr(true);
    } finally {
      setAnalyzing(false);
    }
  }, [jobId]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{ success: boolean; data: Payload }>(
        `/api/employer/jobs/${encodeURIComponent(jobId)}/shortlist`,
      );
      if (!res.data?.success || !res.data.data) throw new Error("failed");
      const payload = res.data.data;
      setData(payload);

      if (
        !autoRan.current &&
        payload.applicantCount > 0 &&
        (payload.needsRefresh || payload.entries.length === 0)
      ) {
        autoRan.current = true;
        setLoading(false);
        await runAiShortlist();
        return;
      }
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [jobId, runAiShortlist]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err && !data) {
    return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={() => void load()} />;
  }

  const entries = data?.entries ?? [];
  const applicantCount = data?.applicantCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/employer/jobs" className="text-sm font-semibold text-brand-teal underline">
            {t("backToJobs")}
          </Link>
          {data?.jobTitle ? (
            <p className="mt-2 text-sm text-[#6B7280]">
              <Briefcase className="me-1 inline h-4 w-4" aria-hidden />
              {data.jobTitle}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-[#9CA3AF]">
            {t("applicantCount", { count: applicantCount })}
            {data?.generatedAt
              ? ` · ${t("lastUpdated")} ${new Date(data.generatedAt).toLocaleString()}`
              : null}
            {data?.aiPowered ? ` · ${t("poweredByClaude")}` : null}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 gap-2"
          disabled={analyzing || applicantCount === 0}
          onClick={() => void runAiShortlist()}
        >
          <RefreshCw className={cn("h-4 w-4", analyzing && "animate-spin")} aria-hidden />
          {analyzing ? t("analyzing") : t("refreshAi")}
        </Button>
      </div>

      {analyzing ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-teal/25 bg-brand-lightTeal/30 px-4 py-3 text-sm text-[#0D2137]">
          <Brain className="h-5 w-5 shrink-0 text-brand-teal animate-pulse" aria-hidden />
          {t("analyzingDetail", { count: applicantCount })}
        </div>
      ) : entries.length > 0 ? (
        <ShortlistSummaryBanner entries={entries} t={t} />
      ) : null}

      {applicantCount === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[#6B7280]">{t("noApplicants")}</p>
      ) : !entries.length && !analyzing ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[#6B7280]">{t("empty")}</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => (
            <ShortlistCard key={e.applicationId} entry={e} t={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ShortlistSummaryBanner({
  entries,
  t,
}: {
  entries: ShortlistEntry[];
  t: ReturnType<typeof useTranslations<"employerShortlist">>;
}) {
  const interviewed = entries.filter((e) => e.interviewCompleted).length;
  const strongly = entries.filter((e) => e.hiringRecommendation === "STRONGLY_RECOMMEND").length;
  const recommended = entries.filter((e) => e.hiringRecommendation === "RECOMMEND").length;
  const notRec = entries.filter(
    (e) => e.hiringRecommendation === "NOT_RECOMMEND" || e.hiringRecommendation === "STRONGLY_NOT_RECOMMEND",
  ).length;
  const top = entries[0];

  return (
    <div className="rounded-xl border border-[#0F4C75]/20 bg-[#EFF6FF] p-4 text-sm text-[#0D2137]">
      <p className="font-bold">{t("summaryBannerTitle", { count: interviewed })}</p>
      <p className="mt-1 text-[#374151]">
        {t("summaryStrongly", { count: strongly })} · {t("summaryRecommended", { count: recommended })} ·{" "}
        {t("summaryNotRecommended", { count: notRec })}
      </p>
      {top ? <p className="mt-2 text-brand-teal">{t("summaryTopPick", { name: top.name })}</p> : null}
    </div>
  );
}

function ShortlistCard({
  entry,
  t,
}: {
  entry: ShortlistEntry;
  t: ReturnType<typeof useTranslations<"employerShortlist">>;
}) {
  const tier = tierStyles(entry.matchTier);
  const tierLabel =
    entry.matchTier === "top"
      ? t("tierTop")
      : entry.matchTier === "recommended"
        ? t("tierRecommended")
        : entry.matchTier === "partial"
          ? t("tierPartial")
          : t("tierWeak");

  return (
    <li
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        tier.border,
        entry.rank === 1 && "ring-2 ring-emerald-300/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F4C75] text-xs font-bold text-white">
              #{entry.rank}
            </span>
            <h3 className="text-lg font-bold text-[#0D2137]">{entry.name}</h3>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", tier.badge)}>{tierLabel}</span>
          </div>
          {entry.professionalTitle ? (
            <p className="mt-1 text-sm text-[#6B7280]">{entry.professionalTitle}</p>
          ) : null}
        </div>
        <div className="text-end">
          <p className="text-2xl font-extrabold text-brand-teal">{entry.totalScore}</p>
          <p className="text-xs font-medium text-[#6B7280]">/100</p>
        </div>
      </div>

      {entry.hiringRecommendation ? (
        <span className="mt-3 inline-block rounded-full bg-[#0F4C75] px-3 py-1 text-xs font-bold text-white">
          {entry.hiringRecommendation.replace(/_/g, " ")}
        </span>
      ) : null}

      {(entry.commScore != null || entry.contentScore != null) && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#374151]">
          {entry.commScore != null ? <span>💬 Comm: {entry.commScore}/10</span> : null}
          {entry.contentScore != null ? <span>🧠 Content: {entry.contentScore}/10</span> : null}
          {entry.facialScore != null ? <span>😊 Facial: {entry.facialScore}/10</span> : null}
          {entry.fitScore != null ? <span>🎯 Fit: {entry.fitScore}/10</span> : null}
        </div>
      )}

      {entry.redFlag ? (
        <Badge size="sm" className="mt-2 bg-red-50 font-semibold text-red-800">
          ⚠ {entry.redFlag}
        </Badge>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill
          ok={entry.assessmentCompleted}
          okLabel={t("assessmentDone", { score: entry.assessmentScore ?? "—" })}
          noLabel={t("assessmentMissing")}
          Icon={Sparkles}
        />
        <StatusPill
          ok={entry.interviewCompleted}
          okLabel={t("interviewDone", { score: entry.interviewScore ?? "—" })}
          noLabel={t("interviewMissing")}
          Icon={Video}
        />
        <Badge size="sm" variant="neutral">
          {t("applied")} {new Date(entry.appliedAt).toLocaleDateString()}
        </Badge>
      </div>

      <p className="mt-4 text-sm font-semibold text-[#0D2137]">{entry.recommendation}</p>
      <p className="mt-1 text-sm text-[#374151]">{entry.matchNote}</p>

      {entry.cvSummary ? (
        <div className="mt-4 rounded-lg bg-[#F8FAFC] p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t("cvSummary")}
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-[#374151]">{entry.cvSummary}</p>
        </div>
      ) : null}

      {entry.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.skills.slice(0, 8).map((s) => (
            <Badge key={s} size="sm" variant="teal">
              {s}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-[#EEF2F7] bg-white p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#0F4C75]">
          <Brain className="h-3.5 w-3.5" aria-hidden />
          {t("aiSpec")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#374151]">{entry.aiAnalysis}</p>
      </div>

      {(entry.strengths.length > 0 || entry.gaps.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {entry.strengths.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-emerald-800">{t("strengths")}</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-4 text-xs text-[#374151]">
                {entry.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {entry.gaps.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-amber-800">{t("gaps")}</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-4 text-xs text-[#374151]">
                {entry.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/employer/candidates/${entry.applicationId}/interview-report`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0F4C75] px-4 text-xs font-semibold text-white hover:bg-[#0D2137]"
        >
          {t("viewFullReport")}
        </Link>
        <Link
          href={`/dashboard/employer/candidates/${entry.applicationId}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0F4C75] px-4 text-sm font-semibold text-white hover:bg-[#0D2137]"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          {t("viewProfile")}
        </Link>
      </div>
    </li>
  );
}

function StatusPill({
  ok,
  okLabel,
  noLabel,
  Icon,
}: {
  ok: boolean;
  okLabel: string;
  noLabel: string;
  Icon: typeof Video;
  }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        ok ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600",
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <XCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {ok ? okLabel : noLabel}
    </span>
  );
}
