"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminTalentPoolPayload } from "@/types/admin";

export function TalentPoolAdminPageClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.talentPoolPage");
  const tAdmin = useTranslations("adminPanel");
  const tc = useTranslations("common");
  const [data, setData] = useState<AdminTalentPoolPayload | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/talent-pool", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: AdminTalentPoolPayload };
    if (j.success && j.data) setData(j.data);
  }, []);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  async function remove(entryId: string) {
    await fetch(`/api/admin/talent-pool?entryId=${entryId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await refresh();
  }

  function exportCsv() {
    if (!data) return;
    const header = "name,email,score,reason,added\n";
    const rows = data.items
      .map(
        (r) =>
          `${r.name ?? ""},${r.email},${r.assessmentScore ?? ""},${r.reason},${r.addedAt}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "talent-pool.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label={t("total")} value={data.summary.total} />
        <Summary label={t("addedWeek")} value={data.summary.addedThisWeek} />
        <Summary label="Exited" value={data.summary.exitedImproved} />
        <Summary label={t("avgScore")} value={`${data.summary.averageScore}/100`} />
      </div>
      <button type="button" onClick={exportCsv} className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-[#0F4C75]">
        {tAdmin("exportCsv")}
      </button>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2 text-start">Candidate</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Skills</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name={r.name} email={r.email} size="sm" />
                    {r.name}
                  </div>
                </td>
                <td className="px-3 py-2">{r.assessmentScore ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.skills.join(", ") || "—"}</td>
                <td className="px-3 py-2 text-xs">{r.reason}</td>
                <td className="px-3 py-2">{r.progressPercent}%</td>
                <td className="px-3 py-2 text-end">
                  <button type="button" className="text-xs text-red-600" onClick={() => void remove(r.id)}>
                    {t("remove")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="text-xl font-bold text-[#0D2137]">{value}</p>
    </div>
  );
}
