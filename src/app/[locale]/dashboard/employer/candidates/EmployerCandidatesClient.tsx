"use client";

import axios from "axios";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ApplicationStatus } from "@/types";
import {
  applicationStatusBadgeVariant,
  applicationStatusTranslationKey,
} from "@/components/dashboard/applicationStatusUi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Row = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  jobTitle: string;
  jobId: string;
  candidateName: string | null;
  candidateEmail: string;
};

export function EmployerCandidatesClient() {
  const t = useTranslations("dashboard");
  const tj = useTranslations("jobs");
  const tc = useTranslations("common");
  const tec = useTranslations("employerCandidates");

  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jobId, setJobId] = useState("");
  const [appStatus, setAppStatus] = useState<ApplicationStatus | "">("");
  const [sort, setSort] = useState<"newest" | "oldest" | "match">("newest");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "10");
      params.set("sort", sort);
      if (jobId.trim()) params.set("jobId", jobId.trim());
      if (appStatus) params.set("status", appStatus);
      const res = await axios.get<{
        success: boolean;
        data: { items: Row[]; totalPages?: number };
      }>(`/api/employer/applications?${params.toString()}`);
      setItems(res.data.data.items);
      setTotalPages(res.data.data.totalPages ?? 1);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [page, jobId, appStatus, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(applicationId: string, status: ApplicationStatus) {
    try {
      await axios.patch(`/api/employer/applications/${applicationId}`, { status });
      await load();
    } catch {
      /* ignore */
    }
  }

  if (loading && !items.length) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("dashboardLoadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 rounded-xl border border-[#EEF2F7] bg-white p-4">
        <input
          placeholder="Job ID filter"
          value={jobId}
          onChange={(e) => {
            setPage(1);
            setJobId(e.target.value);
          }}
          className="min-h-11 flex-1 rounded-lg border px-3 text-sm md:max-w-xs"
        />
        <select
          value={appStatus}
          onChange={(e) => {
            setPage(1);
            setAppStatus((e.target.value as ApplicationStatus | "") || "");
          }}
          className="min-h-11 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">{tc("filter")} —</option>
          {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {tj(`status.${s.toLowerCase()}` as never)}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value as "newest" | "oldest" | "match");
          }}
          className="min-h-11 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="newest">{tj("sortNewest")}</option>
          <option value="oldest">{tec("sortOldest")}</option>
          <option value="match">{tj("matchScore")}</option>
        </select>
      </div>

      {!items.length ? (
        <div className="rounded-xl border border-dashed p-14 text-center">{t("emptyApplicationsTitle")}</div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => (
            <article
              key={row.id}
              className="flex flex-col gap-4 rounded-xl border border-[#EEF2F7] bg-white p-5 shadow-sm lg:flex-row lg:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <InitialsAvatar name={row.candidateName} email={row.candidateEmail} />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#0D2137]">
                    {row.candidateName?.trim() || row.candidateEmail}
                  </p>
                  <p className="text-xs text-[#6B7280]">{row.candidateEmail}</p>
                  <p className="mt-2 text-sm text-[#374151]">
                    {row.jobTitle} · {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant={applicationStatusBadgeVariant(row.status)} size="sm" className="w-fit capitalize">
                {t(applicationStatusTranslationKey(row.status) as never)}
              </Badge>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label={t("statusCol")}
                  className="min-h-10 rounded-lg border bg-white px-2 text-xs font-semibold"
                  value={row.status}
                  onChange={(e) => void updateStatus(row.id, e.target.value as ApplicationStatus)}
                >
                  {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {tj(`status.${s.toLowerCase()}` as never)}
                    </option>
                  ))}
                </select>
                <Link
                  href={`/dashboard/employer/candidates/${row.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg border-2 border-brand-blue px-3 text-xs font-semibold text-brand-blue hover:bg-brand-lightBlue"
                >
                  {tec("viewProfile")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {tc("back")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {tc("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
