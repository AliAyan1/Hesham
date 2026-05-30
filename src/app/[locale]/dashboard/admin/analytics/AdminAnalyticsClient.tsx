"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsData = {
  users: { jobSeekers: number; employers: number; newThisMonth: number };
  jobs: number;
  applications: number;
  assessmentsDone: number;
  interviewsDone: number;
  hires: number;
  revenue: { recruitmentFees: number; thisMonth: number };
  assessmentPassRate: number;
};

export default function AdminAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    void fetch("/api/admin/analytics", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: AnalyticsData }>)
      .then((j) => {
        if (j.success && j.data) setData(j.data);
      });
  }, []);

  if (!data) {
    return <p className="text-sm text-[#6B7280]">Loading analytics…</p>;
  }

  const userGrowth = [
    { name: "Job seekers", value: data.users.jobSeekers },
    { name: "Employers", value: data.users.employers },
  ];

  const scorePie = [
    { name: "Pass rate", value: data.assessmentPassRate },
    { name: "Other", value: 100 - data.assessmentPassRate },
  ];

  const revenueBar = [{ name: "This month", value: data.revenue.thisMonth }];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#0D2137]">Platform analytics</h1>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/analytics/export?type=stats"
            className="rounded-lg border border-brand-blue px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-lightBlue/30"
          >
            Export stats CSV
          </a>
          <a
            href="/api/admin/analytics/export?type=audit"
            className="rounded-lg bg-brand-teal px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Export audit log CSV
          </a>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Job seekers" value={data.users.jobSeekers} />
        <Stat label="Employers" value={data.users.employers} />
        <Stat label="Applications" value={data.applications} />
        <Stat label="Hires" value={data.hires} />
        <Stat label="Assessments" value={data.assessmentsDone} />
        <Stat label="Interviews" value={data.interviewsDone} />
        <Stat label="Revenue (SAR)" value={Math.round(data.revenue.recruitmentFees)} />
        <Stat label="New users (month)" value={data.users.newThisMonth} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Users">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0F4C75" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Assessment pass rate">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={scorePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#1D9E75" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue this month (SAR)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueBar}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0D2137]">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-[#0D2137]">{title}</h2>
      {children}
    </div>
  );
}
