"use client";

import {
  Briefcase,
  CheckCircle2,
  Coins,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminDashboardPending } from "@/components/admin/AdminDashboardPending";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminStatsPayload } from "@/types/admin";

export default function AdminDashboardMainClient() {
  const t = useTranslations("adminPanel");
  const tc = useTranslations("common");
  const [data, setData] = useState<AdminStatsPayload | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const res = await fetch("/api/admin/stats", { credentials: "include" });
    if (!res.ok) {
      setError(true);
      return;
    }
    const json = (await res.json()) as { success?: boolean; data?: AdminStatsPayload };
    if (json.success && json.data) setData(json.data);
    else setError(true);
  }, []);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  const onApproveMentor = async (mentorId: string) => {
    await fetch("/api/admin/mentors/approve", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId }),
    });
    await refresh();
  };

  const onRejectMentor = async (mentorId: string, reason: string) => {
    await fetch("/api/admin/mentors/reject", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId, reason }),
    });
    await refresh();
  };

  const onPayPayout = async (payoutId: string, reference: string) => {
    await fetch("/api/admin/payouts/pay", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId, reference }),
    });
    await refresh();
  };

  if (error && !data) {
    return <ErrorState title={t("loadError")} onRetry={() => void refresh()} retryLabel={tc("retry")} />;
  }

  if (!data && isLoading) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  if (!data) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  const o = data.overview;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t("dashboardTitle")}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label={t("stats.totalUsers")}
          value={o.totalUsers}
          sub={t("stats.newToday", { count: o.newUsersToday })}
          subClassName="text-[#1D9E75] font-medium"
          Icon={Users}
          borderColor="#0F4C75"
        />
        <AdminStatCard
          label={t("stats.activeJobs")}
          value={o.activeJobs}
          sub={t("stats.postedToday", { count: o.jobsPostedToday })}
          Icon={Briefcase}
          borderColor="#1D9E75"
        />
        <AdminStatCard
          label={t("stats.totalRevenue")}
          value={`SAR ${o.totalRevenue.toLocaleString()}`}
          sub={t("stats.revenueMonth", { amount: o.revenueThisMonth })}
          Icon={Coins}
          borderColor="#C9973A"
        />
        <AdminStatCard
          label={t("stats.successfulHires")}
          value={o.successfulHires}
          sub={t("stats.hiresMonth", { count: o.hiresThisMonth })}
          Icon={CheckCircle2}
          borderColor="#7C3AED"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label={t("stats.jobSeekers")}
          value={o.jobSeekers.total}
          Icon={Users}
          borderColor="#0F4C75"
        >
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-gray-400" /> Free {o.jobSeekers.free}
            <span className="h-2 w-2 rounded-full bg-[#0F4C75]" /> Pro {o.jobSeekers.pro}
            <span className="h-2 w-2 rounded-full bg-[#C9973A]" /> Premium {o.jobSeekers.premium}
          </div>
        </AdminStatCard>
        <AdminStatCard
          label={t("stats.employers")}
          value={o.employers.total}
          sub={`${t("stats.active")} ${o.employers.active} · ${t("stats.inactive")} ${o.employers.inactive}`}
          Icon={Users}
          borderColor="#1D9E75"
        />
        <AdminStatCard
          label={t("stats.assessments")}
          value={o.assessments.completed}
          sub={
            <span className="text-red-600">
              {t("stats.flagged", { count: o.assessments.flagged })}
            </span>
          }
          Icon={CheckCircle2}
          borderColor="#0F4C75"
        />
        <AdminStatCard
          label={t("stats.interviews")}
          value={o.interviews.completed}
          sub={
            <span className="text-red-600">
              {t("stats.flagged", { count: o.interviews.flagged })}
            </span>
          }
          Icon={CheckCircle2}
          borderColor="#7C3AED"
        />
      </section>

      <AdminDashboardCharts
        userGrowth={data.userGrowth}
        revenueByMonth={data.revenueByMonth}
        scoreDistribution={data.scoreDistribution}
        applicationsByStatus={data.applicationsByStatus}
      />

      <AdminDashboardPending
        data={data}
        onApproveMentor={onApproveMentor}
        onRejectMentor={onRejectMentor}
        onPayPayout={onPayPayout}
      />
    </div>
  );
}
