"use client";

import { useTranslations } from "next-intl";
import { MENTOR_INDUSTRIES } from "@/lib/mentor/constants";

export type MentorSort = "rating_desc" | "price_asc" | "price_desc" | "sessions_desc" | "name_asc";

export type MentorFilterState = {
  industry: string;
  minRating: number;
  minRate: number;
  maxRate: number;
  expertise: string;
  sort: MentorSort;
};

type Props = {
  filters: MentorFilterState;
  priceCeiling: number;
  expertiseTags: string[];
  activeCount: number;
  onChange: (patch: Partial<MentorFilterState>) => void;
  onClear: () => void;
  className?: string;
};

const INDUSTRY_ICONS: Record<string, string> = {
  Technology: "💻",
  Hospitality: "🏨",
  Finance: "💰",
  HR: "👥",
  Marketing: "📣",
  Operations: "⚙️",
  Healthcare: "🏥",
  Education: "🎓",
  Legal: "⚖️",
  Consulting: "💼",
};

function StarRow({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</span>
        <span className="text-xs font-medium text-brand-teal">
          {value > 0 ? `${value}+ ★` : "Any"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            value === 0
              ? "bg-brand-teal text-white shadow-sm"
              : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
          }`}
        >
          Any
        </button>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} stars minimum`}
            onClick={() => onChange(value === star ? 0 : star)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
              value >= star
                ? "border-amber-300 bg-amber-50 text-amber-500"
                : "border-[#E5E7EB] bg-white text-[#D1D5DB] hover:border-amber-200 hover:bg-amber-50/50"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function DualPriceSlider({
  min,
  max,
  ceiling,
  onChange,
  label,
  currencyLabel,
}: {
  min: number;
  max: number;
  ceiling: number;
  onChange: (min: number, max: number) => void;
  label: string;
  currencyLabel: string;
}) {
  const step = 25;
  const lo = Math.min(min, max - step);
  const hi = Math.max(max, min + step);
  const pctLo = (lo / ceiling) * 100;
  const pctHi = (hi / ceiling) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</span>
        <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
          {currencyLabel} {lo} – {hi}
        </span>
      </div>

      <div className="relative mx-1 mb-3 h-2 rounded-full bg-[#E5E7EB]">
        <div
          className="absolute h-2 rounded-full bg-brand-teal"
          style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
        />
        <input
          type="range"
          min={0}
          max={ceiling}
          step={step}
          value={lo}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange(Math.min(next, hi - step), hi);
          }}
          className="mentor-range-input pointer-events-auto absolute inset-0 z-20 h-2 w-full cursor-pointer appearance-none bg-transparent"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={0}
          max={ceiling}
          step={step}
          value={hi}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange(lo, Math.max(next, lo + step));
          }}
          className="mentor-range-input pointer-events-auto absolute inset-0 z-30 h-2 w-full cursor-pointer appearance-none bg-transparent"
          aria-label="Maximum price"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-[#6B7280]">
          Min
          <input
            type="number"
            min={0}
            max={hi - step}
            step={step}
            value={lo}
            onChange={(e) => {
              const next = Math.max(0, Math.min(Number(e.target.value), hi - step));
              onChange(next, hi);
            }}
            className="mt-0.5 w-full rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm font-medium text-[#0D2137] focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
        </label>
        <label className="block text-[11px] text-[#6B7280]">
          Max
          <input
            type="number"
            min={lo + step}
            max={ceiling}
            step={step}
            value={hi}
            onChange={(e) => {
              const next = Math.min(ceiling, Math.max(Number(e.target.value), lo + step));
              onChange(lo, next);
            }}
            className="mt-0.5 w-full rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm font-medium text-[#0D2137] focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
        </label>
      </div>
    </div>
  );
}

export function MentorFiltersPanel({
  filters,
  priceCeiling,
  expertiseTags,
  activeCount,
  onChange,
  onClear,
  className = "",
}: Props) {
  const t = useTranslations("mentor");

  return (
    <aside
      className={`w-full shrink-0 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm lg:w-72 ${className}`}
    >
      <div className="border-b border-[#E5E7EB] bg-gradient-to-r from-[#F0FDFA] to-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0D2137]">{t("filters")}</h2>
            <p className="text-xs text-[#6B7280]">{t("filtersSubtitle")}</p>
          </div>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-[11px] font-semibold text-[#374151] hover:bg-[#F9FAFB]"
            >
              {t("clearFilters")} ({activeCount})
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-6 p-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{t("industry")}</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ industry: "" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !filters.industry
                  ? "bg-brand-teal text-white shadow-sm"
                  : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
              }`}
            >
              {t("allIndustries")}
            </button>
            {MENTOR_INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => onChange({ industry: filters.industry === ind ? "" : ind })}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.industry === ind
                    ? "bg-[#0F4C75] text-white shadow-sm"
                    : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                }`}
              >
                <span aria-hidden>{INDUSTRY_ICONS[ind] ?? "•"}</span>
                {ind}
              </button>
            ))}
          </div>
        </div>

        {expertiseTags.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{t("expertise")}</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ expertise: "" })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  !filters.expertise
                    ? "bg-brand-teal text-white"
                    : "bg-[#EFF6FF] text-[#0F4C75] hover:bg-[#DBEAFE]"
                }`}
              >
                {t("allExpertise")}
              </button>
              {expertiseTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onChange({ expertise: filters.expertise === tag ? "" : tag })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    filters.expertise === tag
                      ? "bg-[#0F4C75] text-white shadow-sm"
                      : "bg-[#EFF6FF] text-[#0F4C75] hover:bg-[#DBEAFE]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <StarRow
          label={t("minRating")}
          value={filters.minRating}
          onChange={(minRating) => onChange({ minRating })}
        />

        <DualPriceSlider
          label={t("priceRange")}
          currencyLabel={t("currencySar")}
          min={filters.minRate}
          max={filters.maxRate}
          ceiling={priceCeiling}
          onChange={(minRate, maxRate) => onChange({ minRate, maxRate })}
        />
      </div>
    </aside>
  );
}

export function MentorSortSelect({
  value,
  onChange,
  className = "",
}: {
  value: MentorSort;
  onChange: (v: MentorSort) => void;
  className?: string;
}) {
  const t = useTranslations("mentor");
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="shrink-0 text-[#6B7280]">{t("sortBy")}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MentorSort)}
        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#0D2137] focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
      >
        <option value="rating_desc">{t("sortRating")}</option>
        <option value="price_asc">{t("sortPriceLow")}</option>
        <option value="price_desc">{t("sortPriceHigh")}</option>
        <option value="sessions_desc">{t("sortSessions")}</option>
        <option value="name_asc">{t("sortName")}</option>
      </select>
    </label>
  );
}
