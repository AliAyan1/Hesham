"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminAuditRow } from "@/types/admin";

export default function AdminAuditLogsClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.auditPage");
  const tAdmin = useTranslations("adminPanel");
  const tc = useTranslations("common");
  const [items, setItems] = useState<AdminAuditRow[]>([]);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (action) qs.set("action", action);
    if (search) qs.set("search", search);
    const res = await fetch(`/api/admin/audit-logs?${qs}`, { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: { items: AdminAuditRow[] } };
    if (j.success && j.data) setItems(j.data.items);
  }, [action, search]);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  function exportCsv() {
    const header = "timestamp,user,action,details,ip,status\n";
    const rows = items
      .map(
        (r) =>
          `${r.timestamp},${r.userEmail ?? ""},${r.action},${r.details},${r.ipAddress ?? ""},${r.status}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} />
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder={t("filterAction")} value={action} onChange={(e) => setAction(e.target.value)} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder={t("filterSearch")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" onClick={() => void refresh()} className="rounded-lg bg-[#0F4C75] px-4 py-2 text-sm text-white">{tc("search")}</button>
        <button type="button" onClick={exportCsv} className="rounded-lg border px-4 py-2 text-sm">{tAdmin("exportCsv")}</button>
      </div>
      {isLoading && !items.length ? (
        <LoadingSpinner label={tc("loading")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2">{t("colTime")}</th>
                <th className="px-3 py-2">{t("colUser")}</th>
                <th className="px-3 py-2">{t("colAction")}</th>
                <th className="px-3 py-2">{t("colDetails")}</th>
                <th className="px-3 py-2">{t("colIp")}</th>
                <th className="px-3 py-2">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className={`border-t ${statusRowClass(r.status)}`}>
                  <td className="px-3 py-2 text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.userName ?? "—"}</p>
                    <p className="text-xs text-[#6B7280]">{r.userEmail}</p>
                  </td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2 text-xs">{r.details}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.ipAddress ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusRowClass(status: AdminAuditRow["status"]): string {
  if (status === "failed") return "bg-red-50/60";
  if (status === "warning") return "bg-amber-50/60";
  return "bg-emerald-50/30";
}
