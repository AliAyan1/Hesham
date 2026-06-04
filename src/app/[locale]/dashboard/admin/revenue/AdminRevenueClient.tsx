"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Coins } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminRevenuePayload } from "@/types/admin";

export default function AdminRevenueClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.revenuePage");
  const tAdmin = useTranslations("adminPanel");
  const tc = useTranslations("common");
  const [data, setData] = useState<AdminRevenuePayload | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/revenue", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: AdminRevenuePayload };
    if (j.success && j.data) setData(j.data);
  }, []);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  function exportCsv() {
    if (!data) return;
    const header = "date,type,party,amount,vat,total,status\n";
    const rows = data.transactions
      .map(
        (r) =>
          `${r.date},${r.type},${r.partyName},${r.amount},${r.vat},${r.total},${r.status}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  return (
    <div className="space-y-8">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label={t("allTime")} value={`SAR ${data.totalAllTime.toLocaleString()}`} Icon={Coins} borderColor="#0F4C75" />
        <AdminStatCard label={t("thisMonth")} value={`SAR ${data.thisMonth.toLocaleString()}`} Icon={Coins} borderColor="#1D9E75" />
        <AdminStatCard label={t("lastMonth")} value={`SAR ${data.lastMonth.toLocaleString()}`} Icon={Coins} borderColor="#6B7280" />
        <AdminStatCard label={t("growth")} value={`${data.growthPercent >= 0 ? "+" : ""}${data.growthPercent}%`} Icon={Coins} borderColor="#C9973A" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <BreakdownCard label="Subscriptions" amount={data.breakdown.subscriptions} />
        <BreakdownCard label="Recruitment" amount={data.breakdown.recruitmentFees} />
        <BreakdownCard label="Sessions" amount={data.breakdown.mentorSessions} />
      </div>
      <div className="rounded-xl border bg-white p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.monthlyChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="subscriptions" stackId="a" fill="#0F4C75" />
            <Bar dataKey="recruitmentFees" stackId="a" fill="#1D9E75" />
            <Bar dataKey="mentorSessions" stackId="a" fill="#C9973A" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between">
        <h3 className="font-bold text-[#0D2137]">{t("transactions")}</h3>
        <button type="button" onClick={exportCsv} className="rounded-lg border border-[#0F4C75] px-3 py-1.5 text-sm font-semibold text-[#0F4C75]">
          {tAdmin("exportCsv")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2">{t("colDate")}</th>
              <th className="px-3 py-2">{t("colType")}</th>
              <th className="px-3 py-2">{t("colParty")}</th>
              <th className="px-3 py-2">{t("colAmount")}</th>
              <th className="px-3 py-2">{t("colVat")}</th>
              <th className="px-3 py-2">{t("colTotal")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.partyName}</td>
                <td className="px-3 py-2">{r.amount}</td>
                <td className="px-3 py-2">{r.vat}</td>
                <td className="px-3 py-2 font-semibold">{r.total}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BreakdownCard({
  label,
  amount,
}: {
  label: string;
  amount: { amount: number; percent: number };
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D2137]">SAR {amount.amount.toLocaleString()}</p>
      <p className="text-sm text-[#6B7280]">{amount.percent}% of total</p>
    </div>
  );
}
