"use client";

import axios from "axios";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Row = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  reason: string;
  trainingTags: unknown;
  createdAt: string;
};

export function TalentPoolAdminClient() {
  const t = useTranslations("adminTalentPool");
  const tc = useTranslations("common");
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{ success: boolean; data: { items: Row[] } }>("/api/admin/talent-pool");
      setItems(res.data?.data?.items ?? []);
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
    <div className="overflow-x-auto">
      <table className="min-w-full text-start text-sm">
        <thead className="bg-[#F8FAFC] text-xs font-bold uppercase text-[#6B7280]">
          <tr>
            <th className="px-3 py-2">{t("colName")}</th>
            <th className="px-3 py-2">{t("colEmail")}</th>
            <th className="px-3 py-2">{t("colReason")}</th>
            <th className="px-3 py-2">{t("colTags")}</th>
            <th className="px-3 py-2">{t("colDate")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t border-[#EEF2F7]">
              <td className="px-3 py-2 font-medium">{r.name?.trim() || r.email}</td>
              <td className="px-3 py-2 text-[#6B7280]">{r.email}</td>
              <td className="px-3 py-2">{r.reason}</td>
              <td className="px-3 py-2 text-xs text-[#374151]">
                {typeof r.trainingTags === "object" && r.trainingTags !== null
                  ? JSON.stringify(r.trainingTags)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-xs text-[#6B7280]">{new Date(r.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length ? <p className="py-8 text-center text-sm text-[#6B7280]">{t("empty")}</p> : null}
    </div>
  );
}
