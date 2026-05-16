"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Row = {
  id: string;
  title: string;
  applicationCount: number;
  interviewedCount: number;
  interviewSetup: "none" | "ai" | "custom";
  questionCount: number;
};

export function EmployerInterviewsListClient() {
  const t = useTranslations("employerInterviews");
  const tc = useTranslations("common");
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{ success: boolean; data: { jobs: Row[] } }>("/api/employer/jobs/interview-overview");
      setItems(res.data?.data?.jobs ?? []);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !items.length) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-4">
      {!items.length ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-[#6B7280]">{t("emptyJobs")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((j) => (
            <li
              key={j.id}
              className="flex flex-col gap-4 rounded-xl border border-[#EEF2F7] bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="text-lg font-bold text-[#0D2137]">{j.title}</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {j.interviewSetup === "none" && <span className="font-medium text-amber-700">{t("statusNotSet")}</span>}
                  {j.interviewSetup === "ai" && <span className="font-medium text-emerald-700">{t("statusAi")}</span>}
                  {j.interviewSetup === "custom" && <span className="font-medium text-[#7C3AED]">{t("statusCustom")}</span>}
                  <span className="mx-2 text-[#D1D5DB]">·</span>
                  <span>
                    {t("interviewedCount", {
                      count: String(j.interviewedCount),
                      total: String(j.applicationCount),
                    })}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/employer/interviews/${j.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white hover:brightness-105"
                >
                  {t("viewInterviews")}
                </Link>
                <Link
                  href={`/dashboard/employer/interviews/${j.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg border-2 border-[#7C3AED] px-4 text-sm font-semibold text-[#7C3AED] hover:bg-[#F5F3FF]"
                >
                  {t("editQuestions")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
