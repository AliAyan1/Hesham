"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Row = {
  id: string;
  status: string;
  overallScore: number | null;
  completedAt: string | null;
  jobId: string | null;
  interviewKind: string | null;
  jobTitle: string | null;
};

export default function InterviewHomeClient() {
  const t = useTranslations("interview");
  const tc = useTranslations("common");
  const session = useSession();
  const rawTier = session.data?.user?.subscriptionTier as string | undefined;
  const tier: SubscriptionTier =
    rawTier === "PROFESSIONAL" || rawTier === "PREMIUM" ? (rawTier as SubscriptionTier) : "FREE";
  const can = hasAccess(tier, "ai_assessment");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancel = false;
    void fetch("/api/interview/summary", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { interviews: Row[] } }>)
      .then((j) => {
        if (!cancel && j.success && j.data?.interviews) setRows(j.data.interviews);
        else if (!cancel) setRows([]);
      })
      .catch(() => {
        if (!cancel) setRows([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (!session.data?.user) return <LoadingSpinner size="full" label={tc("loading")} />;

  if (!can) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-8 text-center">
        <p className="text-lg font-bold text-[#0D2137]">{t("upgradeTitle")}</p>
        <p className="mt-2 text-sm text-[#6B7280]">{t("upgradeBody")}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0F4C75] px-6 text-sm font-semibold text-white"
        >
          {t("upgradeCta")}
        </Link>
      </div>
    );
  }

  const scheduled = (rows ?? []).filter(
    (r) =>
      r.interviewKind === "job" &&
      (r.status === "PENDING" || r.status === "IN_PROGRESS") &&
      r.jobId,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-[#0D2137]">{t("title")}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">{t("subtitle")}</p>
      </header>

      <article className="mx-auto max-w-xl rounded-2xl border border-[#EEF2F7] bg-white p-8 shadow-sm">
        <p className="text-3xl" aria-hidden>
          🎙️
        </p>
        <h2 className="mt-3 text-xl font-bold text-[#0D2137]">{t("practiceCard.title")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{t("practiceCard.desc")}</p>
        <ul className="mt-4 space-y-1 text-sm text-[#374151]">
          <li>{t("practiceCard.duration")}</li>
          <li>{t("practiceCard.questions")}</li>
        </ul>
        <Link
          href="/dashboard/job-seeker/interview/practice"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-teal px-4 text-sm font-semibold text-white"
        >
          {t("practiceCard.cta")}
        </Link>
      </article>

      {scheduled.length > 0 ? (
        <section className="rounded-xl border border-[#EEF2F7] bg-[#F8FAFC] p-6">
          <h2 className="text-lg font-bold text-[#0D2137]">{t("scheduledTitle")}</h2>
          <p className="mt-1 text-sm text-[#6B7280]">{t("scheduledSubtitle")}</p>
          <ul className="mt-4 space-y-3">
            {scheduled.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
              >
                <span className="text-sm font-medium text-[#0D2137]">
                  {row.jobTitle ?? t("scheduledJobFallback")}
                </span>
                <Link
                  href={{
                    pathname: "/dashboard/job-seeker/interview/job",
                    query: { jobId: row.jobId ?? undefined },
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0F4C75] px-4 text-sm font-semibold text-white"
                >
                  {t("startRealInterview")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
