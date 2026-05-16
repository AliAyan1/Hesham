"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ApplicationStatus } from "@/types";
import {
  applicationStatusBadgeVariant,
  applicationStatusTranslationKey,
} from "@/components/dashboard/applicationStatusUi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Row = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  createdAt: string;
  offerAcceptedAt: string | null;
};

export function ApplicationsListClient() {
  const t = useTranslations("dashboard");
  const tj = useTranslations("jobs");
  const tc = useTranslations("common");

  const [items, setItems] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const tApp = useTranslations("jobSeekerApplications");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/job-seeker/applications", { credentials: "include" });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const json: unknown = await res.json();
      const parsed =
        json &&
        typeof json === "object" &&
        "data" in json &&
        json.data &&
        typeof json.data === "object" &&
        "items" in json.data
          ? (json.data as { items: Row[] }).items
          : [];
      setItems(Array.isArray(parsed) ? parsed : []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(id: string) {
    setWithdrawing(id);
    try {
      const res = await fetch(`/api/job-seeker/applications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setWithdrawing(null);
    }
  }

  async function acceptOffer(id: string) {
    setAccepting(id);
    try {
      const res = await fetch(`/api/job-seeker/applications/${encodeURIComponent(id)}/accept-offer`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) await load();
    } finally {
      setAccepting(null);
    }
  }

  if (status === "loading" && items.length === 0) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  if (status === "error") {
    return <ErrorState title={t("dashboardLoadError")} retryLabel={tc("retry")} onRetry={() => void load()} />;
  }

  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <p className="text-lg font-bold text-[#0D2137]">{t("emptyApplicationsTitle")}</p>
        <p className="mt-2 text-sm text-[#6B7280]">{t("browseJobsPrompt")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-[#EEF2F7] bg-white shadow-sm">
      <table className="min-w-full border-collapse text-start text-sm">
        <thead className="bg-[#F8FAFC]">
          <tr>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{t("jobTitleCol")}</th>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{t("companyCol")}</th>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{t("dateAppliedCol")}</th>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{t("statusCol")}</th>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{t("actionView")}</th>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{tj("withdraw")}</th>
            <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#6B7280]">{tApp("acceptOffer")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-t border-[#F1F5F9]">
              <td className="px-4 py-4 font-semibold text-[#0D2137]">{row.jobTitle}</td>
              <td className="px-4 py-4 text-[#6B7280]">{row.company}</td>
              <td className="px-4 py-4 text-[#6B7280]">{new Date(row.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-4">
                <Badge variant={applicationStatusBadgeVariant(row.status)} size="sm" className="font-medium">
                  {t(applicationStatusTranslationKey(row.status) as never)}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/dashboard/job-seeker/jobs/${row.jobId}`}
                  className="font-semibold text-brand-teal hover:underline"
                >
                  {t("actionView")}
                </Link>
              </td>
              <td className="px-4 py-4">
                {row.status === ApplicationStatus.PENDING ? (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="min-h-10"
                    loading={withdrawing === row.id}
                    onClick={() => void withdraw(row.id)}
                  >
                    {tj("withdraw")}
                  </Button>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">—</span>
                )}
              </td>
              <td className="px-4 py-4">
                {row.status === ApplicationStatus.SHORTLISTED && !row.offerAcceptedAt ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    className="min-h-10"
                    loading={accepting === row.id}
                    onClick={() => void acceptOffer(row.id)}
                  >
                    {tApp("acceptOffer")}
                  </Button>
                ) : row.offerAcceptedAt ? (
                  <span className="text-xs font-semibold text-emerald-700">{tApp("offerAccepted")}</span>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
