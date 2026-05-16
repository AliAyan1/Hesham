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
        <Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0F4C75] px-6 text-sm font-semibold text-white">
          {t("upgradeCta")}
        </Link>
      </div>
    );
  }

  const last = rows?.find((r) => r.status === "COMPLETED");

  const cards: Array<{ kind: "practice" | "competency" | "job"; href: string }> = [
    { kind: "practice", href: "/dashboard/job-seeker/interview/practice" },
    { kind: "competency", href: "/dashboard/job-seeker/interview/competency" },
    { kind: "job", href: "/dashboard/job-seeker/interview/job" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-[#0D2137]">{t("title")}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">{t("subtitle")}</p>
      </header>
      {last?.overallScore != null ? (
        <p className="text-sm font-semibold text-brand-teal">
          {t("score")}: {last.overallScore}/100
        </p>
      ) : null}
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <article key={c.kind} className="flex flex-col rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0D2137]">{t(`cards.${c.kind}.title` as never)}</h2>
            <p className="mt-2 flex-1 text-sm text-[#6B7280]">{t(`cards.${c.kind}.desc` as never)}</p>
            <p className="mt-3 text-xs text-[#6B7280]">{t("durationHint")}</p>
            <Link
              href={c.href}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-4 text-sm font-semibold text-white"
            >
              {t("start")}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
