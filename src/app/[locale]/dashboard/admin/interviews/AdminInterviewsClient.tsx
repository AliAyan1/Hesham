"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Flag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminInterviewsPayload } from "@/types/admin";

export default function AdminInterviewsClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.interviewsPage");
  const tc = useTranslations("common");
  const tAdmin = useTranslations("adminPanel");
  const [data, setData] = useState<AdminInterviewsPayload | null>(null);
  const [status, setStatus] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`/api/admin/interviews${qs}`, { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: AdminInterviewsPayload };
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
          Icon={FileText}
          borderColor="#0F4C75"
        />
        <AdminStatCard
          label={t("completed")}
          value={String(data.stats.completed)}
          Icon={FileText}
          borderColor="#1D9E75"
        />
        <AdminStatCard
          label={t("inProgress")}
          value={String(data.stats.inProgress)}
          Icon={FileText}
          borderColor="#C9973A"
        />
        <AdminStatCard
          label={t("flagged")}
          value={String(data.stats.flagged)}
          Icon={Flag}
          borderColor="#DC2626"
        />
      </div>
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">{t("filterAll")}</option>
        <option value="completed">{t("filterCompleted")}</option>
        <option value="in-progress">{t("filterInProgress")}</option>
        <option value="pending">{t("filterPending")}</option>
        <option value="flagged">{t("filterFlagged")}</option>
      </select>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2 text-start">{t("colCandidate")}</th>
              <th className="px-3 py-2">{t("colKind")}</th>
              <th className="px-3 py-2">{t("colJob")}</th>
              <th className="px-3 py-2">{t("colScore")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
              <th className="px-3 py-2">{t("colCompleted")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr
                key={row.id}
                className={row.isFlagged ? "border-t bg-red-50/40" : "border-t"}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <InitialsAvatar
                      name={row.candidateName}
                      email={row.candidateEmail}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium">{row.candidateName ?? "—"}</p>
                      <p className="text-xs text-[#6B7280]">{row.candidateEmail}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 capitalize">{row.interviewKind ?? "—"}</td>
                <td className="px-3 py-2">{row.jobTitle ?? "—"}</td>
                <td className={`px-3 py-2 font-semibold ${scoreColor(row.overallScore)}`}>
                  {row.overallScore ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {row.status}
                  {row.isFlagged ? (
                    <span className="ms-1 text-xs font-semibold text-red-600">⚠</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[#6B7280]">
                  {row.completedAt
                    ? new Date(row.completedAt).toLocaleString()
                    : row.startedAt
                      ? new Date(row.startedAt).toLocaleString()
                      : "—"}
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

function scoreColor(score: number | null): string {
  if (score == null) return "";
  if (score >= 80) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}
