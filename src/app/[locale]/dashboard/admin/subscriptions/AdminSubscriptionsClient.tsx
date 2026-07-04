"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminSubscriptionsPayload } from "@/types/admin";

export default function AdminSubscriptionsClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.subscriptionsPage");
  const tc = useTranslations("common");
  const tAdmin = useTranslations("adminPanel");
  const [data, setData] = useState<AdminSubscriptionsPayload | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/subscriptions", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: AdminSubscriptionsPayload };
    if (j.success && j.data) {
      setData(j.data);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
  }, []);

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
    <div className="space-y-8">
      <AdminPageHeader
        title={title}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label={t("mrr")}
          value={`SAR ${data.stats.mrrEstimate.toLocaleString()}`}
          Icon={CreditCard}
          borderColor="#0F4C75"
        />
        <AdminStatCard
          label={t("paidThisMonth")}
          value={`SAR ${data.stats.paidThisMonth.toLocaleString()}`}
          Icon={CreditCard}
          borderColor="#1D9E75"
        />
        <AdminStatCard
          label={t("proPlan")}
          value={String(data.stats.professional)}
          Icon={Users}
          borderColor="#C9973A"
        />
        <AdminStatCard
          label={t("premiumPlan")}
          value={String(data.stats.premium)}
          Icon={Users}
          borderColor="#6B7280"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("activeSubscribers")}</h2>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-start">{t("colUser")}</th>
                <th className="px-3 py-2">{t("colPlan")}</th>
                <th className="px-3 py-2">{t("colRole")}</th>
                <th className="px-3 py-2">{t("colStarted")}</th>
              </tr>
            </thead>
            <tbody>
              {data.activeSubscribers.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <InitialsAvatar name={row.name} email={row.email} size="sm" />
                      <div>
                        <p className="font-medium">{row.name ?? "—"}</p>
                        <p className="text-xs text-[#6B7280]">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-semibold">{row.tier}</td>
                  <td className="px-3 py-2">{row.role}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#6B7280]">
                    {row.subscriptionStart
                      ? new Date(row.subscriptionStart).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.activeSubscribers.length ? (
            <p className="p-6 text-center text-[#6B7280]">{t("noSubscribers")}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("recentPayments")}</h2>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-start">{t("colUser")}</th>
                <th className="px-3 py-2">{t("colPlan")}</th>
                <th className="px-3 py-2">{t("colAmount")}</th>
                <th className="px-3 py-2">{t("colStatus")}</th>
                <th className="px-3 py-2">{t("colDate")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.userName ?? "—"}</p>
                    <p className="text-xs text-[#6B7280]">{row.userEmail}</p>
                  </td>
                  <td className="px-3 py-2">{row.plan ?? "—"}</td>
                  <td className="px-3 py-2 font-semibold">
                    SAR {row.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.status === "PAID"
                          ? "text-emerald-700"
                          : row.status === "FAILED"
                            ? "text-red-600"
                            : "text-amber-700"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#6B7280]">
                    {new Date(row.paidAt ?? row.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.recentPayments.length ? (
            <p className="p-6 text-center text-[#6B7280]">{t("noPayments")}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
