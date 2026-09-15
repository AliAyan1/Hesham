"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { INSIGHT_ARTICLES, type InsightCategory } from "@/lib/basalim/insights-articles";

const TABS: { id: InsightCategory; en: string; ar: string }[] = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "people", en: "People", ar: "الناس" },
  { id: "leadership", en: "Leadership", ar: "القيادة" },
  { id: "recruitment", en: "Recruitment", ar: "التوظيف" },
  { id: "saudi-hr", en: "Saudi HR", ar: "الموارد البشرية" },
  { id: "hospitality", en: "Hospitality", ar: "الضيافة" },
];

type Props = { locale: string };

export function InsightsPageClient({ locale }: Props) {
  const isAr = locale === "ar";
  const [active, setActive] = useState<InsightCategory>("all");

  const filtered = useMemo(() => {
    if (active === "all") return INSIGHT_ARTICLES;
    return INSIGHT_ARTICLES.filter((a) => a.category === active);
  }, [active]);

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-4 md:px-6">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active === tab.id
                  ? "bg-[#1A6B5A] text-white"
                  : "bg-gray-100 text-[#374151] hover:bg-gray-200",
              ].join(" ")}
            >
              {isAr ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      <section className="bg-[#FAFAF9] px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <Link
              key={article.slug}
              href={`/insights/${article.slug}`}
              className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase text-[#1A6B5A]">
                {isAr ? article.categoryLabelAr : article.categoryLabelEn}
              </span>
              <h2 className="mt-3 text-lg font-bold text-[#0D1F2D]">
                {isAr ? article.titleAr : article.titleEn}
              </h2>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-[#6B7280]">
                {isAr ? article.excerptAr : article.excerptEn}
              </p>
              <p className="mt-4 text-xs text-[#9CA3AF]">
                {isAr ? "فريق باسالم كونسلتينج" : "Basalim Consulting Team"} · {article.date} ·{" "}
                {article.readMinutes} {isAr ? "دقائق" : "min read"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
