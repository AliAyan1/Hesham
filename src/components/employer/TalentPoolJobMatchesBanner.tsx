"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function TalentPoolJobMatchesBanner({ jobId }: { jobId: string }) {
  const t = useTranslations("employerTalentPool");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    void axios
      .get<{ success: boolean; data: { count: number } }>(
        `/api/employer/jobs/${encodeURIComponent(jobId)}/talent-pool-matches`,
      )
      .then((res) => {
        if (!cancel) setCount(res.data?.data?.count ?? 0);
      })
      .catch(() => {
        if (!cancel) setCount(0);
      });
    return () => {
      cancel = true;
    };
  }, [jobId]);

  if (count == null || count === 0) return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-[#0D2137]">
      <p className="font-semibold">{t("jobMatchesBanner", { count })}</p>
      <Link
        href={`/dashboard/employer/talent-pool?inviteJob=${encodeURIComponent(jobId)}`}
        className="mt-1 inline-block font-semibold text-[#7C3AED] underline"
      >
        {t("jobMatchesView")}
      </Link>
    </div>
  );
}
