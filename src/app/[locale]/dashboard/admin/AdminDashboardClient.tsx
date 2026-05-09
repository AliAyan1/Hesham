"use client";

import { Brain, Briefcase, Building2, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { AdminDashboardPayload } from "@/types/dashboard";
import { DashboardWelcomeBanner } from "@/components/dashboard/DashboardWelcomeBanner";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/cn";

export default function AdminDashboardClient({ userName }: { userName: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/admin", { credentials: "include" });
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const json = (await res.json()) as AdminDashboardPayload;
        if (!cancelled) {
          setData(json);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function retry() {
    setStatus("loading");
    void fetch("/api/dashboard/admin", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<AdminDashboardPayload>;
      })
      .then((json) => {
        setData(json);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  if (status === "loading" && !data) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  if (status === "error" || !data) {
    return (
      <ErrorState title={t("dashboardLoadError")} onRetry={retry} retryLabel={tc("retry")} />
    );
  }

  const statGap = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="space-y-8">
      <DashboardWelcomeBanner
        eyebrow={t("adminEyebrow")}
        title={t("welcomeBannerGreeting", { name: userName })}
        subtitle={t("adminBannerSubtitle")}
      />

      <section className={statGap} aria-labelledby="admin-stats">
        <h2 id="admin-stats" className="sr-only">
          {t("adminOverviewSubtitle")}
        </h2>
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#0F4C75]"
          iconBgClass="bg-[#EFF6FF]"
          iconColorClass="text-[#0F4C75]"
          Icon={Users}
          value={data.totalJobSeekers}
          label={t("totalJobSeekers")}
          footer={<span className="text-gray-500">{t("adminRecentUsersSubtitle")}</span>}
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#1D9E75]"
          iconBgClass="bg-[#E1F5EE]"
          iconColorClass="text-[#1D9E75]"
          Icon={Building2}
          value={data.totalEmployers}
          label={t("totalEmployers")}
          footer={<span className="text-gray-500">{t("totalEmployers")}</span>}
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#C9973A]"
          iconBgClass="bg-[#FDF3E3]"
          iconColorClass="text-[#C9973A]"
          Icon={Briefcase}
          value={data.totalJobs}
          label={t("totalJobsPosted")}
          footer={<span className="text-gray-500">{t("recentJobPostings")}</span>}
        />
        <PremiumStatCard
          borderClass="border-s-4 border-s-[#7C3AED]"
          iconBgClass="bg-[#F5F3FF]"
          iconColorClass="text-[#7C3AED]"
          Icon={Brain}
          value={data.totalAssessments}
          label={t("totalAssessments")}
          footer={<span className="text-gray-500">{t("totalAssessments")}</span>}
        />
      </section>

      <section aria-labelledby="admin-users" className="space-y-5">
        <div>
          <h3 id="admin-users" className="text-xl font-semibold text-[#0D2137]">
            {t("adminRecentUsersTitle")}
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">{t("adminRecentUsersSubtitle")}</p>
        </div>
        <div className="overflow-x-auto rounded-[12px] border border-[#F1F5F9] bg-white shadow-sm">
          <table className="min-w-full border-collapse text-start text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("userCol")}
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("emailCol")}
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("roleCol")}
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("joinedCol")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-brand-teal" aria-hidden />
                    <p className="font-bold text-[#0D2137]">{t("emptyUsersTitle")}</p>
                    <p className="mt-2 text-[#6B7280]">{t("emptyUsersBody")}</p>
                  </td>
                </tr>
              ) : (
                data.recentUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={cn(
                      "border-t border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F8FAFC]",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={u.name} email={u.email} />
                        <span className="font-semibold text-[#0D2137]">{u.name ?? tc("emDash")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[#6B7280]">{u.email}</td>
                    <td className="px-4 py-4 font-medium">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        {t((`role${u.role}`) as never)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#6B7280]">
                      {format.dateTime(new Date(u.createdAt), { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="admin-jobs" className="space-y-5">
        <div>
          <h3 id="admin-jobs" className="text-xl font-semibold text-[#0D2137]">
            {t("adminRecentJobsTitle")}
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">{t("adminRecentJobsSubtitle")}</p>
        </div>
        <div className="overflow-x-auto rounded-[12px] border border-[#F1F5F9] bg-white shadow-sm">
          <table className="min-w-full border-collapse text-start text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("jobTitle")}
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("categoryCol")}
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  {t("postedCol")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center">
                    <Briefcase className="mx-auto mb-3 h-10 w-10 text-brand-teal" aria-hidden />
                    <p className="font-bold text-[#0D2137]">{t("emptyJobsTitle")}</p>
                    <p className="mt-2 text-[#6B7280]">{t("emptyJobsBody")}</p>
                  </td>
                </tr>
              ) : (
                data.recentJobs.map((j) => (
                  <tr
                    key={j.id}
                    className="border-t border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F8FAFC]"
                  >
                    <td className="px-4 py-4 font-semibold text-[#0D2137]">{j.title}</td>
                    <td className="px-4 py-4 text-[#6B7280]">{j.category}</td>
                    <td className="px-4 py-4 text-[#6B7280]">
                      {format.dateTime(new Date(j.createdAt), { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
