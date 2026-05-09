"use client";

import { Link } from "@/i18n/navigation";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { SubscriptionTier } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Row = {
  id: string;
  title: string;
  category: string;
  type: string;
  isActive: boolean;
  applicationCount: number;
};

export function EmployerJobsManager({ tier }: { tier: SubscriptionTier }) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const dash = useTranslations("dashboard");
  void tier;

  const [items, setItems] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await axios.get<{ success: boolean; data: { items: Row[] } }>("/api/employer/jobs");
      const list = res.data?.data?.items ?? [];
      setItems(list);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setActive(jobId: string, isActive: boolean) {
    try {
      await axios.put(`/api/jobs/${jobId}`, { isActive });
      await load();
    } catch {
      /* ignore */
    }
  }

  async function remove(jobId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await axios.delete(`/api/jobs/${jobId}`);
      await load();
    } catch {
      /* ignore */
    }
  }

  if (status === "loading" && items.length === 0) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (status === "error") return <ErrorState title={dash("dashboardLoadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0D2137]">{dash("actionManageJobs")}</h2>
        <Link
          href="/dashboard/employer/post-job"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white hover:brightness-105"
        >
          {t("postJob")}
        </Link>
      </div>
      {!items.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-14 text-center">
          <p className="font-semibold text-[#0D2137]">{dash("emptyJobsTitle")}</p>
          <p className="mt-2 text-sm text-[#6B7280]">{dash("emptyJobsBody")}</p>
          <Link
            href="/dashboard/employer/post-job"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#0F4C75] px-6 text-sm font-semibold text-white hover:opacity-95"
          >
            {t("postJob")}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#EEF2F7] bg-white shadow-sm">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                <th className="px-4 py-4">{dash("jobTitleCol")}</th>
                <th className="px-4 py-4">{dash("categoryCol")}</th>
                <th className="px-4 py-4">{dash("applications")}</th>
                <th className="px-4 py-4">{dash("statusCol")}</th>
                <th className="px-4 py-4">{dash("actionView")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-4 font-semibold text-[#0D2137]">{j.title}</td>
                  <td className="px-4 py-4">{j.category}</td>
                  <td className="px-4 py-4">
                    <Badge variant="teal">{j.applicationCount}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={j.isActive}
                        onChange={(e) => void setActive(j.id, e.target.checked)}
                      />
                      {j.isActive ? t("active") : t("paused")}
                    </label>
                  </td>
                  <td className="flex flex-wrap gap-2 px-4 py-4">
                    <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => void remove(j.id)}>
                      {t("deleteJob")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
