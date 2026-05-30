"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { hasAccess } from "@/lib/subscription";
import {
  MentorFiltersPanel,
  MentorSortSelect,
  type MentorFilterState,
  type MentorSort,
} from "@/components/mentor/MentorFiltersPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { SubscriptionTier } from "@/types";

type MentorRow = {
  id: string;
  title: string | null;
  hourlyRate: number | null;
  currency: string;
  averageRating: number;
  totalSessions: number;
  expertise: unknown;
  industries: unknown;
  user: { name: string | null; image: string | null };
};

type MentorMeta = {
  priceCeiling: number;
  expertiseTags: string[];
  totalApproved: number;
};

const DEFAULT_MAX_RATE = 500;

const DEFAULT_FILTERS: MentorFilterState = {
  industry: "",
  minRating: 0,
  minRate: 0,
  maxRate: DEFAULT_MAX_RATE,
  expertise: "",
  sort: "rating_desc",
};

function asTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function countActiveFilters(f: MentorFilterState, ceiling: number): number {
  let n = 0;
  if (f.industry) n += 1;
  if (f.expertise) n += 1;
  if (f.minRating > 0) n += 1;
  if (f.minRate > 0) n += 1;
  if (f.maxRate < ceiling) n += 1;
  return n;
}

function StarDisplay({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? "opacity-100" : i === full && half ? "opacity-60" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function MentorsClient() {
  const t = useTranslations("mentor");
  const tc = useTranslations("common");
  const session = useSession();
  const [rows, setRows] = useState<MentorRow[]>([]);
  const [meta, setMeta] = useState<MentorMeta>({
    priceCeiling: DEFAULT_MAX_RATE,
    expertiseTags: [],
    totalApproved: 0,
  });
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<MentorFilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const rawTier = session.data?.user?.subscriptionTier as string | undefined;
  const tier: SubscriptionTier =
    rawTier === "PROFESSIONAL" || rawTier === "PREMIUM" ? (rawTier as SubscriptionTier) : "FREE";
  const canBook = hasAccess(tier, "mentor_sessions");

  const priceCeiling = meta.priceCeiling || DEFAULT_MAX_RATE;

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (filters.industry) p.set("industry", filters.industry);
    if (filters.expertise) p.set("expertise", filters.expertise);
    if (filters.minRate > 0) p.set("minRate", String(filters.minRate));
    if (filters.maxRate < priceCeiling) p.set("maxRate", String(filters.maxRate));
    if (filters.minRating > 0) p.set("minRating", String(filters.minRating));
    if (filters.sort !== "rating_desc") p.set("sort", filters.sort);
    return p.toString();
  }, [q, filters, priceCeiling]);

  const activeFilterCount = countActiveFilters(filters, priceCeiling);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    void fetch(`/api/mentors?${query}`)
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { mentors: MentorRow[]; meta?: MentorMeta } }>)
      .then((j) => {
        if (cancel) return;
        if (j.success && j.data?.mentors) setRows(j.data.mentors);
        if (j.success && j.data?.meta) {
          setMeta(j.data.meta);
          setFilters((prev) => {
            const ceiling = j.data!.meta!.priceCeiling || DEFAULT_MAX_RATE;
            if (prev.maxRate === DEFAULT_MAX_RATE && ceiling !== DEFAULT_MAX_RATE) {
              return { ...prev, maxRate: ceiling };
            }
            return prev;
          });
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [query]);

  const patchFilters = useCallback((patch: Partial<MentorFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...DEFAULT_FILTERS,
      maxRate: priceCeiling,
      sort: prev.sort,
    }));
    setQ("");
  }, [priceCeiling]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (filters.industry) {
      chips.push({
        key: "industry",
        label: filters.industry,
        clear: () => patchFilters({ industry: "" }),
      });
    }
    if (filters.expertise) {
      chips.push({
        key: "expertise",
        label: filters.expertise,
        clear: () => patchFilters({ expertise: "" }),
      });
    }
    if (filters.minRating > 0) {
      chips.push({
        key: "rating",
        label: `${filters.minRating}+ ★`,
        clear: () => patchFilters({ minRating: 0 }),
      });
    }
    if (filters.minRate > 0 || filters.maxRate < priceCeiling) {
      chips.push({
        key: "price",
        label: `SAR ${filters.minRate}–${filters.maxRate}`,
        clear: () => patchFilters({ minRate: 0, maxRate: priceCeiling }),
      });
    }
    if (q.trim()) {
      chips.push({
        key: "q",
        label: `"${q.trim()}"`,
        clear: () => setQ(""),
      });
    }
    return chips;
  }, [filters, patchFilters, priceCeiling, q]);

  const filtersPanel = (
    <MentorFiltersPanel
      filters={filters}
      priceCeiling={priceCeiling}
      expertiseTags={meta.expertiseTags}
      activeCount={activeFilterCount}
      onChange={patchFilters}
      onClear={clearFilters}
      className={mobileFiltersOpen ? "block" : "hidden lg:block"}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">{t("marketplaceTitle")}</h1>
          <p className="mt-1 text-sm text-[#6B7280]">{t("marketplaceSubtitle")}</p>
        </div>
        <MentorSortSelect
          value={filters.sort}
          onChange={(sort) => patchFilters({ sort })}
          className="sm:justify-end"
        />
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          className="w-full rounded-xl border border-[#E5E7EB] bg-white py-3 pe-4 ps-10 text-sm shadow-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!canBook ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("upgradePremium")}{" "}
          <Link href="/pricing" className="font-semibold underline">
            {t("viewPlans")}
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D2137] shadow-sm"
        >
          <span aria-hidden>⚙</span>
          {t("filters")}
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-brand-teal px-2 py-0.5 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#6B7280]">{t("activeFilters")}:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#0F4C75] hover:bg-[#DBEAFE]"
            >
              {chip.label}
              <span aria-hidden className="text-[#6B7280]">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-brand-teal underline"
          >
            {t("clearAll")}
          </button>
        </div>
      ) : null}

      <div className="lg:flex lg:items-start lg:gap-8">
        {filtersPanel}

        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-sm text-[#6B7280]">
            {loading ? t("loading") : t("resultsCount", { count: rows.length, total: meta.totalApproved })}
          </p>

          {loading ? (
            <LoadingSpinner size="md" label={tc("loading")} />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 py-12 text-center">
              <p className="text-4xl" aria-hidden>
                🔍
              </p>
              <p className="mt-3 font-semibold text-[#0D2137]">{t("noMentorsMatch")}</p>
              <p className="mt-1 text-sm text-[#6B7280]">{t("noMentorsMatchHint")}</p>
              {activeFilterCount > 0 || q.trim() ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
                >
                  {t("clearFilters")}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {rows.map((m) => {
                const tags = asTags(m.expertise).slice(0, 3);
                const inds = asTags(m.industries).slice(0, 2);
                const rate = m.hourlyRate ?? 0;
                const initials = (m.user.name ?? m.title ?? "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <article
                    key={m.id}
                    className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-brand-teal/40 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {m.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.user.image}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#F3F4F6]"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-[#0F4C75] text-sm font-bold text-white">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-bold text-[#0D2137]">{m.user.name ?? m.title ?? "—"}</h2>
                        <p className="truncate text-sm text-[#6B7280]">{m.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                          <StarDisplay rating={m.averageRating} />
                          <span className="font-semibold text-[#0D2137]">{m.averageRating.toFixed(1)}</span>
                          <span className="text-[#9CA3AF]">·</span>
                          <span className="text-[#6B7280]">
                            {m.totalSessions} {t("sessionsLabel")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-medium text-[#0F4C75]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {inds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {inds.map((ind) => (
                          <span
                            key={ind}
                            className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#374151]"
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-auto pt-4">
                      <p className="text-base font-bold text-brand-teal">
                        {t("fromRate", { amount: String(rate), currency: m.currency })}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF]">{t("platformFeeNote")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canBook ? (
                          <Link
                            href={`/dashboard/job-seeker/mentors/${m.id}`}
                            className="inline-flex rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#178A66]"
                          >
                            {t("bookSession")}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] px-3 py-2 text-xs text-[#6B7280]">
                            🔒 Premium
                          </span>
                        )}
                        <Link
                          href={`/dashboard/job-seeker/mentors/${m.id}`}
                          className="inline-flex items-center rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                        >
                          {t("viewProfile")}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
