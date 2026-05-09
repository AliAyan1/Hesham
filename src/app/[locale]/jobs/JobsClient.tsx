"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { JOB_CATEGORIES } from "@/lib/jobs/constants";
import { cn } from "@/lib/cn";

type JobItem = {
  id: string;
  title: string;
  titleAr: string | null;
  category: string;
  location: string | null;
  locationAr?: string | null;
  type?: string;
  isRemote?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  createdAt: string;
  companyName?: string | null;
};

type JobsResponse = {
  items: JobItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function JobsClient() {
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";
  const t = useTranslations("pages.jobs");
  const tJobs = useTranslations("jobs");
  const tc = useTranslations("common");

  const categoryOptions = useMemo(() => JOB_CATEGORIES, []);

  function categoryDisplay(cat: string) {
    return tJobs(`marketplaceCategories.${cat}` as never);
  }

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<JobsResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (category) params.set("category", category);
        if (location.trim()) params.set("location", location.trim());
        params.set("page", String(page));
        params.set("pageSize", "10");

        const res = await fetch(`/api/jobs?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("bad");
        const json = (await res.json()) as JobsResponse;
        if (!alive) return;
        setData(json);
        setStatus("idle");
      } catch {
        if (!alive) return;
        setStatus("error");
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [q, category, location, page]);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  function resetAndSetPage1() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{tc("search")}</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetAndSetPage1();
            }}
            placeholder={t("searchPlaceholder")}
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{t("filterCategory")}</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              resetAndSetPage1();
            }}
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          >
            <option value="">{t("filterAll")}</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {categoryDisplay(c)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{t("filterLocation")}</span>
          <input
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              resetAndSetPage1();
            }}
            placeholder={t("filterLocation")}
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          />
        </label>
      </div>

      {status === "loading" ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-[#6B7280]">{tc("loading")}</div>
      ) : status === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{tc("error")}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <p className="text-base font-bold text-[#0D2137]">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-[#6B7280]">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((job) => {
            const loc =
              job.isRemote || !job.location?.trim()
                ? t("remoteLabel")
                : isRTL && job.locationAr?.trim()
                  ? job.locationAr
                  : job.location;
            return (
              <article
                key={job.id}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-[#0D2137]">
                      {isRTL && job.titleAr?.trim() ? job.titleAr : job.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {job.companyName ? (
                        <>
                          <span className="font-medium text-[#374151]">{job.companyName}</span>
                          <span className="mx-1">·</span>
                        </>
                      ) : null}
                      {categoryDisplay(job.category)} · {loc}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <time className="text-xs text-[#9CA3AF]" dateTime={job.createdAt}>
                      {new Date(job.createdAt).toLocaleDateString(locale)}
                    </time>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm font-semibold text-brand-teal hover:underline"
                    >
                      {tJobs("viewDetails")}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className={cn(
            "min-h-11 rounded-xl border px-4 text-sm font-semibold",
            page <= 1
              ? "cursor-not-allowed border-gray-200 text-gray-300"
              : "border-gray-200 text-[#0D2137] hover:bg-gray-50",
          )}
        >
          {t("paginationPrev")}
        </button>
        <p className="text-sm text-[#6B7280]">
          {page} / {totalPages}
        </p>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className={cn(
            "min-h-11 rounded-xl border px-4 text-sm font-semibold",
            page >= totalPages
              ? "cursor-not-allowed border-gray-200 text-gray-300"
              : "border-gray-200 text-[#0D2137] hover:bg-gray-50",
          )}
        >
          {t("paginationNext")}
        </button>
      </div>
    </div>
  );
}
