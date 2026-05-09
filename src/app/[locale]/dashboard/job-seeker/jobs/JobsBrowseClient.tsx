"use client";

import { Bookmark } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { SubscriptionTier } from "@/types";
import { JOB_CATEGORIES } from "@/lib/jobs/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/cn";
import { hasAccess } from "@/lib/subscription";

type JobListRow = {
  id: string;
  title: string;
  category: string;
  type: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  createdAt: string;
  companyName: string;
  employerImage: string | null;
};

type ListResponse = {
  items: JobListRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function JobsBrowseClient() {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const dashboardT = useTranslations("dashboard");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";
  const { data: sess } = useSession();
  const tier = (sess?.user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  const canAiMatchDisplay = hasAccess(tier, "job_matching_ai");

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [jobType, setJobType] = useState<string>("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState<"newest" | "salary">("newest");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<ListResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [savedLookup, setSavedLookup] = useState<Record<string, boolean>>({});

  const typeOptions = useMemo(
    () => ["FULLTIME", "PARTTIME", "CONTRACT", "INTERNSHIP", "REMOTE", "FREELANCE"] as const,
    [],
  );

  function typeLabel(enumVal: string): string {
    const key = enumVal.toLowerCase();
    switch (key) {
      case "fulltime":
        return t("jobTypes.fulltime");
      case "parttime":
        return t("jobTypes.parttime");
      case "contract":
        return t("jobTypes.contract");
      case "internship":
        return t("jobTypes.internship");
      case "remote":
        return t("jobTypes.remote");
      case "freelance":
        return t("jobTypes.freelance");
      default:
        return enumVal;
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    setStatus("loading");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (jobType) params.set("type", jobType);
    if (location.trim()) params.set("location", location.trim());
    if (remoteOnly) params.set("remote", "true");
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", "10");

    void fetch(`/api/jobs?${params.toString()}`, {
      credentials: "include",
      signal: ac.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("list failed");
        return res.json() as Promise<ListResponse>;
      })
      .then(setData)
      .then(() => setStatus("ready"))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStatus("error");
      });

    return () => ac.abort();
  }, [q, category, jobType, remoteOnly, location, sort, page, reloadKey]);

  async function toggleSave(jobId: string, nextSaved: boolean) {
    try {
      const res = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId, saved: nextSaved }),
      });
      if (!res.ok) return;
      setSavedLookup((prev) => ({ ...prev, [jobId]: nextSaved }));
    } catch {
      /* ignore */
    }
  }

  if (status === "error") {
    return (
      <ErrorState
        title={dashboardT("dashboardLoadError")}
        retryLabel={tc("retry")}
        onRetry={() => {
          setReloadKey((k) => k + 1);
          setStatus("loading");
        }}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="rounded-[14px] border border-[#EEF2F7] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[#0D2137]">{t("filters")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <label className="flex flex-col gap-1 xl:col-span-4">
            <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t("search")}</span>
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              className="min-h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2"
              placeholder={t("search")}
            />
          </label>
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {dashboardT("categoryCol")}
            </span>
            <select
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
              className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2"
            >
              <option value="">—</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Type</span>
            <select
              value={jobType}
              onChange={(e) => {
                setPage(1);
                setJobType(e.target.value);
              }}
              className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2"
            >
              <option value="">{tc("optional")}</option>
              {typeOptions.map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {t("locationPlaceholder")}
            </span>
            <input
              value={location}
              onChange={(e) => {
                setPage(1);
                setLocation(e.target.value);
              }}
              className="min-h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2"
              aria-label={t("locationPlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t("sortBy")}</span>
            <select
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value as "newest" | "salary");
              }}
              className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2"
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="salary">{t("sortSalary")}</option>
            </select>
          </label>
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#374151]">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => {
              setPage(1);
              setRemoteOnly(e.target.checked);
            }}
            className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
          />
          {t("remoteOnly")}
        </label>
      </div>

      {status === "loading" && !data ? <LoadingSpinner size="full" label={tc("loading")} /> : null}

      {!items.length && status === "ready" ? (
        <div className="rounded-[14px] border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="text-lg font-bold text-[#0D2137]">{t("noJobs")}</p>
          <p className="mt-2 text-sm text-[#6B7280]">{t("similarJobs")}</p>
        </div>
      ) : (
        <div className={cn(status === "loading" && data ? "opacity-60" : "", "grid gap-5 sm:grid-cols-2 xl:grid-cols-3")}>
          {items.map((j) => {
            const salaryLine =
              j.salaryMin != null || j.salaryMax != null
                ? `${j.salaryMin ?? "—"} – ${j.salaryMax ?? "—"} ${j.currency}`
                : null;
            const saved = savedLookup[j.id] ?? false;
            const locDisplay = j.isRemote ? t("jobTypes.remote") : j.location || tc("emDash");

            return (
              <article
                key={j.id}
                className={cn(
                  "flex flex-col rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm",
                  "transition-shadow hover:shadow-md",
                )}
              >
                <div className="mb-4 flex items-start gap-3">
                  <InitialsAvatar name={j.companyName} email={j.companyName || "co"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      {j.companyName}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-bold text-[#0D2137]">{j.title}</h3>
                  </div>
                  <button
                    type="button"
                    aria-pressed={saved}
                    aria-label={saved ? t("saved") : t("save")}
                    onClick={() => void toggleSave(j.id, !saved)}
                    className={cn(
                      "rounded-lg p-2 transition-colors hover:bg-brand-lightTeal",
                      saved ? "text-brand-teal" : "text-gray-400",
                    )}
                  >
                    <Bookmark className="h-6 w-6" aria-hidden />
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge size="sm" variant="teal">
                    {j.category}
                  </Badge>
                  <Badge size="sm" variant="neutral">
                    {typeLabel(j.type)}
                  </Badge>
                  {!canAiMatchDisplay ? (
                    <Badge size="sm" className="gap-1 bg-[#EFF6FF] font-semibold text-[#1E3A5F]">
                      🔒 AI
                    </Badge>
                  ) : null}
                </div>

                <p className="text-sm text-[#374151]">
                  <span className="font-semibold">{locDisplay}</span>
                  {salaryLine ? <span className="ms-2 text-[#6B7280]">{salaryLine}</span> : null}
                </p>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <p className="text-xs text-[#9CA3AF]">{new Date(j.createdAt).toLocaleDateString()}</p>
                  <Link href={`/dashboard/job-seeker/jobs/${j.id}`}>
                    <Button variant="secondary" size="sm" className="min-h-11 font-semibold">
                      {t("apply")}
                    </Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#6B7280]">
            Page {data.page} / {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {tc("back")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            >
              {tc("next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
