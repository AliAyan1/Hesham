"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Review = {
  id: string;
  rating: number | null;
  review: string | null;
  mentee: { name: string | null };
};

export default function MentorReviewsClient() {
  const t = useTranslations("mentor");
  const [rows, setRows] = useState<Review[]>([]);

  useEffect(() => {
    void fetch("/api/mentor/dashboard", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { recentReviews: Review[] } }>)
      .then((j) => {
        if (j.success && j.data?.recentReviews) setRows(j.data.recentReviews);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("reviews")}</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280]">{t("noReviews")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border bg-white p-4 text-sm">
              <p className="font-semibold">{r.mentee.name ?? "—"}</p>
              <p className="text-[#C9973A]">{"★".repeat(r.rating ?? 0)}</p>
              <p className="mt-1 text-[#374151]">{r.review ?? ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
