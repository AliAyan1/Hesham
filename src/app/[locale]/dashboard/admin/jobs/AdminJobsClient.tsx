"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Briefcase, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminJobsPayload } from "@/types/admin";

export default function AdminJobsClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.jobsPage");
  const tc = useTranslations("common");
  const tAdmin = useTranslations("adminPanel");
  const [data, setData] = useState<AdminJobsPayload | null>(null);
  const [status, setStatus] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`/api/admin/jobs${qs}`, { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: AdminJobsPayload };
    if (j.success && j.data) {
      setData(j.data);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
  }, [status]);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  if (loadFailed && !data) {
    return (
      <ErrorState
        title={tAdmin("loadError")}
        retryLabel={tc("retry")}
        onRetry={() => void refresh()}
      />
    );
  }

  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label={t("total")}
          value={String(data.stats.total)}
          Icon={Briefcase}
          borderColor="#0F4C75"
        />
        <AdminStatCard
          label={t("active")}
          value={String(data.stats.active)}
          Icon={Briefcase}
          borderColor="#1D9E75"
        />
        <AdminStatCard
          label={t("postedToday")}
          value={String(data.stats.postedToday)}
          Icon={Briefcase}
          borderColor="#C9973A"
        />
        <AdminStatCard
          label={t("applications")}
          value={String(data.stats.totalApplications)}
          Icon={Users}
          borderColor="#6B7280"
        />
      </div>
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">{t("filterAll")}</option>
        <option value="active">{t("filterActive")}</option>
        <option value="inactive">{t("filterInactive")}</option>
      </select>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2 text-start">{t("colTitle")}</th>
              <th className="px-3 py-2 text-start">{t("colEmployer")}</th>
              <th className="px-3 py-2">{t("colCategory")}</th>
              <th className="px-3 py-2">{t("colApplications")}</th>
              <th className="px-3 py-2">{t("colViews")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
              <th className="px-3 py-2">{t("colPosted")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-medium text-[#0D2137]">{row.title}</td>
                <td className="px-3 py-2">
                  <p>{row.employerName ?? "—"}</p>
                  <p className="text-xs text-[#6B7280]">{row.employerEmail}</p>
                </td>
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2 text-center">{row.applicationCount}</td>
                <td className="px-3 py-2 text-center">{row.viewCount}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      row.isActive
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
                    }
                  >
                    {row.isActive ? t("statusActive") : t("statusInactive")}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[#6B7280]">
                  {new Date(row.postedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length ? (
          <p className="p-6 text-center text-[#6B7280]">{t("empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
