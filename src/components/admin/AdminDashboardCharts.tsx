"use client";

import {
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
import { useTranslations } from "next-intl";
import type {
  AdminApplicationStatusBar,
  AdminGrowthPoint,
  AdminRevenueMonth,
  AdminScoreBucket,
} from "@/types/admin";

export function AdminDashboardCharts({
  userGrowth,
  revenueByMonth,
  scoreDistribution,
  applicationsByStatus,
}: {
  userGrowth: AdminGrowthPoint[];
  revenueByMonth: AdminRevenueMonth[];
  scoreDistribution: AdminScoreBucket[];
  applicationsByStatus: AdminApplicationStatusBar[];
}) {
  const t = useTranslations("adminPanel");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title={t("charts.userGrowth")}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={userGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="jobSeekers" name={t("charts.jobSeekers")} stroke="#0F4C75" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="employers" name={t("charts.employers")} stroke="#1D9E75" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="mentors" name={t("charts.mentors")} stroke="#C9973A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("charts.revenueByMonth")}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="subscriptions" name={t("charts.subscriptions")} fill="#0F4C75" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recruitmentFees" name={t("charts.recruitmentFees")} fill="#1D9E75" radius={[4, 4, 0, 0]} />
            <Bar dataKey="mentorSessions" name={t("charts.mentorSessions")} fill="#C9973A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("charts.scoreDistribution")}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={scoreDistribution}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(props) => {
                const p = props as { label?: string; payload?: { percentage?: number } };
                return `${p.label ?? ""} ${p.payload?.percentage ?? 0}%`;
              }}
            >
              {scoreDistribution.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, _name, props) => [`${value} (${props.payload.percentage}%)`, props.payload.label]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("charts.applicationsStatus")}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={applicationsByStatus} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {applicationsByStatus.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-[#0D2137]">{title}</h3>
      {children}
    </div>
  );
}
