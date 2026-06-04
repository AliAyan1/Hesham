"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminStatsPayload } from "@/types/admin";

type AnalyticsBundle = AdminStatsPayload;

export default function AdminAnalyticsPageClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.analyticsPage");
  const tc = useTranslations("common");
  const [stats, setStats] = useState<AnalyticsBundle | null>(null);
  const [extra, setExtra] = useState<{
    assessmentPassRate: number;
    hires: number;
    revenueMonth: number;
  } | null>(null);

  const load = useCallback(async () => {
    const [statsRes, analyticsRes] = await Promise.all([
      fetch("/api/admin/stats", { credentials: "include" }),
      fetch("/api/admin/analytics", { credentials: "include" }),
    ]);
    const statsJson = (await statsRes.json()) as { data?: AnalyticsBundle };
    const analyticsJson = (await analyticsRes.json()) as {
      data?: {
        assessmentPassRate: number;
        hires: number;
        revenue: { thisMonth: number };
      };
    };
    if (statsJson.data) setStats(statsJson.data);
    if (analyticsJson.data) {
      setExtra({
        assessmentPassRate: analyticsJson.data.assessmentPassRate,
        hires: analyticsJson.data.hires,
        revenueMonth: analyticsJson.data.revenue.thisMonth,
      });
    }
  }, []);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 60000);

  if (!stats) return <LoadingSpinner size="full" label={tc("loading")} />;

  const tierPie = [
    { name: "Free", value: stats.overview.jobSeekers.free },
    { name: "Pro", value: stats.overview.jobSeekers.pro },
    { name: "Premium", value: stats.overview.jobSeekers.premium },
  ];

  const funnel = [
    { stage: "Registered", count: stats.overview.totalUsers },
    { stage: "Assessed", count: stats.overview.assessments.completed },
    { stage: "Applied", count: stats.applicationsByStatus.reduce((s, b) => s + b.count, 0) },
    { stage: "Interviewed", count: stats.overview.interviews.completed },
    { stage: "Hired", count: stats.overview.successfulHires },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} pollIntervalSec={60} />
      <a
        href="/api/admin/analytics/export?type=stats"
        className="inline-block rounded-lg border border-[#0F4C75] px-4 py-2 text-sm font-semibold text-[#0F4C75]"
      >
        {t("exportReport")}
      </a>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label={t("kpiUsers")} value={`${stats.overview.newUsersToday} today`} />
        <Kpi label={t("kpiRevenue")} value={`SAR ${extra?.revenueMonth ?? stats.overview.revenueThisMonth}`} />
        <Kpi label={t("kpiAssessmentRate")} value={`${extra?.assessmentPassRate ?? 0}%`} />
        <Kpi label={t("kpiInterviewRate")} value={`${stats.overview.interviews.completed}`} />
        <Kpi label={t("kpiHireRate")} value={`${extra?.hires ?? stats.overview.successfulHires}`} />
        <Kpi label={t("kpiTimeToHire")} value="14" />
      </div>
      <ChartBox title="User growth">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stats.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line dataKey="jobSeekers" stroke="#0F4C75" strokeWidth={2} dot={false} />
            <Line dataKey="employers" stroke="#1D9E75" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title="Revenue trend">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stats.revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="subscriptions" stackId="1" fill="#0F4C75" stroke="#0F4C75" />
            <Area type="monotone" dataKey="recruitmentFees" stackId="1" fill="#1D9E75" stroke="#1D9E75" />
            <Area type="monotone" dataKey="mentorSessions" stackId="1" fill="#C9973A" stroke="#C9973A" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartBox>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartBox title="Subscription mix">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={tierPie} dataKey="value" nameKey="name" outerRadius={80} label>
                {tierPie.map((_, i) => (
                  <Cell key={i} fill={["#9CA3AF", "#0F4C75", "#C9973A"][i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Score distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Bar dataKey="count">
                {stats.scoreDistribution.map((e) => (
                  <Cell key={e.label} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <ChartBox title="Hire funnel">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnel} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="stage" width={100} />
            <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D2137]">{value}</p>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-[#0D2137]">{title}</h3>
      {children}
    </div>
  );
}
