"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import type { SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import InterviewSessionClient from "./InterviewSessionClient";

export default function InterviewTypeClient({ kind }: { kind: "practice" | "competency" | "job" }) {
  const t = useTranslations("interview");
  const tc = useTranslations("common");
  const session = useSession();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");

  const rawTier = session.data?.user?.subscriptionTier as string | undefined;
  const tier: SubscriptionTier =
    rawTier === "PROFESSIONAL" || rawTier === "PREMIUM" ? (rawTier as SubscriptionTier) : "FREE";
  const can = hasAccess(tier, "ai_assessment");

  const [resolvedJobId, setResolvedJobId] = useState<string | null>(jobIdParam);
  const [jobResolveDone, setJobResolveDone] = useState(kind !== "job");

  useEffect(() => {
    if (kind !== "job") return;
    if (jobIdParam) {
      setResolvedJobId(jobIdParam);
      setJobResolveDone(true);
      return;
    }
    let cancel = false;
    void fetch("/api/interview/summary", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { interviews: Array<{ status: string; interviewKind: string | null; jobId: string | null }> } }>)
      .then((j) => {
        if (cancel || !j.success || !j.data?.interviews) return;
        const row = j.data.interviews.find(
          (r) =>
            (r.status === "PENDING" || r.status === "IN_PROGRESS") &&
            r.interviewKind === "job" &&
            r.jobId,
        );
        setResolvedJobId(row?.jobId ?? null);
      })
      .catch(() => {
        if (!cancel) setResolvedJobId(null);
      })
      .finally(() => {
        if (!cancel) setJobResolveDone(true);
      });
    return () => {
      cancel = true;
    };
  }, [kind, jobIdParam]);

  if (!session.data?.user) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (!can) {
    return (
      <p className="text-sm text-[#6B7280]">
        <Link href="/pricing" className="text-brand-teal underline">
          {t("upgradeCta")}
        </Link>
      </p>
    );
  }

  if (kind === "job" && !jobResolveDone) {
    return <LoadingSpinner size="md" label={tc("loading")} />;
  }

  if (kind === "job" && !resolvedJobId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#6B7280]">{t("noPendingJobInterview")}</p>
        <Link href="/dashboard/job-seeker/interview" className="text-sm font-semibold text-brand-teal underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  return <InterviewSessionClient kind={kind} jobId={kind === "job" ? resolvedJobId : null} />;
}
