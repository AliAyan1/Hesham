"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { TalentPoolProgress } from "@/lib/talent-pool/talent-pool-criteria";

type Props = {
  progress: TalentPoolProgress;
};

const ACTION_HREF: Record<string, string> = {
  assessmentScore: "/dashboard/job-seeker/assessment",
  assessmentSteps: "/dashboard/job-seeker/assessment",
  profileCompletion: "/dashboard/job-seeker/profile",
  atsScore: "/dashboard/job-seeker/cv",
};

export function TalentPoolProgressTracker({ progress }: Props) {
  const t = useTranslations("talentPoolProgress");

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/80 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#0D2137]">{t("heading")}</h2>
      <p className="mt-1 text-sm text-[#374151]">{t("readyPercent", { percent: progress.readyPercent })}</p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-violet-200"
        role="progressbar"
        aria-valuenow={progress.readyPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[#7C3AED] transition-all"
          style={{ width: `${progress.readyPercent}%` }}
        />
      </div>
      <ul className="mt-4 space-y-3">
        {progress.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={item.done ? "text-emerald-800" : "text-[#374151]"}>
              {item.done ? "✓ " : "○ "}
              {t(`item_${item.id}`)} — {t("current", { value: item.currentValue })}
            </span>
            {!item.done ? (
              <Link
                href={ACTION_HREF[item.id] ?? "/dashboard/job-seeker"}
                className="font-semibold text-[#7C3AED] underline"
              >
                {t(`action_${item.id}`)}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
