"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Entry = {
  userId: string;
  name: string;
  totalScore: number;
  recommendation: string;
  matchNote: string;
};

export function JobShortlistClient({ jobId }: { jobId: string }) {
  const t = useTranslations("employerShortlist");
  const tc = useTranslations("common");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{
        success: boolean;
        data: { entries: unknown };
      }>(`/api/employer/jobs/${encodeURIComponent(jobId)}/shortlist`);
      const raw = res.data?.data?.entries;
      const list = Array.isArray(raw) ? (raw as Entry[]) : [];
      setEntries(list.filter((e) => e && typeof e.userId === "string"));
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/employer/jobs" className="text-sm font-semibold text-brand-teal underline">
        {t("backToJobs")}
      </Link>
      {!entries.length ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[#6B7280]">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.userId} className="rounded-xl border border-[#EEF2F7] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold text-[#0D2137]">{e.name}</p>
                <span className="rounded-full bg-brand-lightTeal px-3 py-1 text-xs font-bold text-brand-teal">
                  {e.totalScore}/100
                </span>
              </div>
              <p className="mt-2 text-sm text-[#374151]">{e.recommendation}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{e.matchNote}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
