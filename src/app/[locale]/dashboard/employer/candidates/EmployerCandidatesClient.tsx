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
  contactHidden?: boolean;
  candidateId: string;
  hasSharedAssessment: boolean;
  hasSharedInterview: boolean;
  sharedAssessmentScore: number | null;
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
  const [hasAssessment, setHasAssessment] = useState<"" | "true" | "false">("");
  const [hasInterview, setHasInterview] = useState<"" | "true" | "false">("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

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
      if (hasAssessment) params.set("hasAssessment", hasAssessment);
      if (hasInterview) params.set("hasInterview", hasInterview);
      const minN = minScore.trim() ? Number.parseInt(minScore.trim(), 10) : NaN;
      const maxN = maxScore.trim() ? Number.parseInt(maxScore.trim(), 10) : NaN;
      if (!Number.isNaN(minN) && minN >= 0 && minN <= 100) params.set("minScore", String(minN));
      if (!Number.isNaN(maxN) && maxN >= 0 && maxN <= 100) params.set("maxScore", String(maxN));

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
  }, [page, jobId, appStatus, sort, hasAssessment, hasInterview, minScore, maxScore]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(applicationId: string, status: ApplicationStatus, reason?: string) {
    try {
      await axios.patch(`/api/employer/applications/${applicationId}`, {
        status,
        ...(status === ApplicationStatus.REJECTED && reason ? { declineReason: reason } : {}),
      });
      await load();
    } catch {
      /* ignore */
    }
  }

  function onStatusChange(applicationId: string, next: ApplicationStatus) {
    if (next === ApplicationStatus.REJECTED) {
      setDeclineReason("");
      setRejectModal({ id: applicationId });
      return;
    }
    void patchStatus(applicationId, next);
  }

  async function confirmReject() {
    if (!rejectModal || !declineReason.trim()) return;
    setRejectSubmitting(true);
    try {
      await patchStatus(rejectModal.id, ApplicationStatus.REJECTED, declineReason.trim());
      setRejectModal(null);
    } finally {
      setRejectSubmitting(false);
    }
  }

  if (loading && !items.length) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("dashboardLoadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-6">
      {rejectModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#0D2137]">{tec("declineModalTitle")}</h3>
            <label className="mt-4 block text-sm font-medium text-[#374151]">{tec("declineReasonLabel")}</label>
            <textarea
              className="mt-2 w-full rounded-lg border p-3 text-sm"
              rows={5}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={tec("declineReasonPlaceholder")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectModal(null)}>
                {tec("declineCancel")}
              </Button>
              <Button
                type="button"
                loading={rejectSubmitting}
                disabled={!declineReason.trim()}
                onClick={() => void confirmReject()}
              >
                {tec("declineSubmit")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 rounded-xl border border-[#EEF2F7] bg-white p-4">
        <input
          placeholder={tec("jobIdFilterPlaceholder")}
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
        <select
          value={hasAssessment}
          onChange={(e) => {
            setPage(1);
            setHasAssessment((e.target.value as "" | "true" | "false") || "");
          }}
          className="min-h-11 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">
            {tec("filterHasAssessment")}: {tec("filterAny")}
          </option>
          <option value="true">{tec("filterYes")}</option>
        </select>
        <select
          value={hasInterview}
          onChange={(e) => {
            setPage(1);
            setHasInterview((e.target.value as "" | "true" | "false") || "");
          }}
          className="min-h-11 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">
            {tec("filterHasInterview")}: {tec("filterAny")}
          </option>
          <option value="true">{tec("filterYes")}</option>
        </select>
        <input
          type="number"
          min={0}
          max={100}
          placeholder={tec("filterMinScore")}
          value={minScore}
          onChange={(e) => {
            setPage(1);
            setMinScore(e.target.value);
          }}
          className="min-h-11 w-24 rounded-lg border px-2 text-sm"
        />
        <input
          type="number"
          min={0}
          max={100}
          placeholder={tec("filterMaxScore")}
          value={maxScore}
          onChange={(e) => {
            setPage(1);
            setMaxScore(e.target.value);
          }}
          className="min-h-11 w-24 rounded-lg border px-2 text-sm"
        />
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
                <InitialsAvatar
                  name={row.candidateName}
                  email={row.candidateEmail || row.candidateName || "?"}
                />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#0D2137]">
                    {row.candidateName?.trim() || row.candidateEmail || "—"}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {row.contactHidden ? tec("contactHiddenHint") : row.candidateEmail}
                  </p>
                  <p className="mt-2 text-sm text-[#374151]">
                    {row.jobTitle} · {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.hasSharedAssessment ? (
                      <Badge size="sm" className="bg-emerald-50 font-semibold text-emerald-800">
                        {tec("badgeAssessment")}
                        {row.sharedAssessmentScore != null ? ` · ${row.sharedAssessmentScore}` : ""}
                      </Badge>
                    ) : null}
                    {row.hasSharedInterview ? (
                      <Badge size="sm" className="bg-indigo-50 font-semibold text-indigo-800">
                        {tec("badgeInterview")}
                      </Badge>
                    ) : null}
                  </div>
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
                  onChange={(e) => void onStatusChange(row.id, e.target.value as ApplicationStatus)}
                >
                  {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {tj(`status.${s.toLowerCase()}` as never)}
                    </option>
                  ))}
                </select>
                <Link
                  href={`/dashboard/employer/messages?to=${encodeURIComponent(row.candidateId)}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-3 text-xs font-semibold text-[#374151] hover:bg-gray-50"
                >
                  {tec("messageCandidate")}
                </Link>
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
