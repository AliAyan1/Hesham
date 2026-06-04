"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminAssessmentRow } from "@/types/admin";

export default function AdminAssessmentsClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.assessmentsPage");
  const tc = useTranslations("common");
  const [items, setItems] = useState<AdminAssessmentRow[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, flagged: 0, inProgress: 0 });
  const [status, setStatus] = useState("");
  const [proctoringId, setProctoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = status ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/assessments${qs}`, { credentials: "include" });
    const j = (await res.json()) as {
      success?: boolean;
      data?: { items: AdminAssessmentRow[]; stats: typeof stats };
    };
    if (j.success && j.data) {
      setItems(j.data.items);
      setStats(j.data.stats);
    }
  }, [status]);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  const selected = items.find((i) => i.id === proctoringId);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} />
      <p className="text-sm text-[#6B7280]">
        {t("total")}: {stats.total} | {t("completed")}: {stats.completed} | {t("flagged")}: {stats.flagged} | {t("inProgress")}: {stats.inProgress}
      </p>
      <select className="rounded-lg border px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All</option>
        <option value="completed">Completed</option>
        <option value="flagged">Flagged</option>
        <option value="in-progress">In progress</option>
      </select>
      {isLoading && !items.length ? (
        <LoadingSpinner label={tc("loading")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-start">Candidate</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className={row.isFlagged ? "border-t bg-red-50/50" : "border-t"}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <InitialsAvatar name={row.name} email="user@qudrahtech.com" size="sm" />
                      {row.name}
                    </div>
                  </td>
                  <td className={`px-3 py-2 font-semibold ${scoreColor(row.score)}`}>{row.score ?? "—"}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 text-red-600">{row.flagCount}</td>
                  <td className="px-3 py-2 text-end">
                    {row.isFlagged ? (
                      <button type="button" className="text-xs font-semibold text-[#0F4C75]" onClick={() => setProctoringId(row.id)}>
                        {t("viewProctoring")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length ? <p className="p-6 text-center text-[#6B7280]">{t("empty")}</p> : null}
        </div>
      )}
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
            <h4 className="font-bold">{t("viewProctoring")}</h4>
            <pre className="mt-2 max-h-60 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(selected.proctoringFlags, null, 2)}
            </pre>
            <button type="button" className="mt-4 text-sm text-[#6B7280]" onClick={() => setProctoringId(null)}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function scoreColor(score: number | null): string {
  if (score == null) return "";
  if (score >= 80) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}
