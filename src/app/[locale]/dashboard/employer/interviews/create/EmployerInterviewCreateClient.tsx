"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";

type Row = { id: string; title: string; interviewSetup: "none" | "ai" | "custom" };

export function EmployerInterviewCreateClient() {
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

  if (loading) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280]">{t("createPickJob")}</p>
      <ul className="divide-y divide-[#EEF2F7] rounded-xl border border-[#EEF2F7] bg-white">
        {items.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <span className="font-semibold text-[#0D2137]">{j.title}</span>
            <Link
              href={`/dashboard/employer/interviews/${j.id}`}
              className="inline-flex min-h-10 items-center rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white hover:brightness-105"
            >
              {t("designForJob")}
            </Link>
          </li>
        ))}
      </ul>
      {!items.length ? <p className="text-center text-sm text-[#6B7280]">{t("emptyJobs")}</p> : null}
    </div>
  );
}
