"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  isProctoringTalentPoolReason,
  type JobSeekerTalentPoolStatus,
} from "@/lib/talent-pool/talent-pool-types";

type Props = {
  status: JobSeekerTalentPoolStatus;
  locale: string;
  className?: string;
};

export function TalentPoolStatusBanner({ status, locale, className }: Props) {
  const t = useTranslations("dashboard");
  const ta = useTranslations("assessment");

  if (!status.inTalentPool && !status.proctoringSuspended) return null;

  const isRtl = locale === "ar" || locale === "ur";
  const untilLabel = status.proctoringSuspendedUntil
    ? new Date(status.proctoringSuspendedUntil).toLocaleString(isRtl ? "ar" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const proctoring = isProctoringTalentPoolReason(status.reason) || status.proctoringSuspended;

  return (
    <div
      className={
        className ??
        "rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-950"
      }
      role="status"
    >
      <p className="font-semibold">
        {proctoring ? ta("proctoring.suspendedTitle") : t("talentPoolBannerTitle")}
      </p>
      <p className="mt-2">
        {proctoring && status.proctoringSuspended && untilLabel
          ? ta("proctoring.suspendedHome", { datetime: untilLabel })
          : proctoring
            ? ta("proctoring.suspendedBody")
            : t("talentPoolBannerBody")}
      </p>
      {proctoring && status.proctoringSuspended && untilLabel ? (
        <p className="mt-2 text-xs font-medium text-rose-800">
          {ta("proctoring.suspendedUntil", { datetime: untilLabel })}
        </p>
      ) : null}
      {!status.proctoringSuspended && proctoring ? (
        <p className="mt-2 text-xs font-medium text-emerald-800">{t("talentPoolReassessmentReady")}</p>
      ) : null}
      <Link
        href="/dashboard/job-seeker/assessment"
        className="mt-3 inline-flex text-sm font-semibold text-brand-teal underline"
      >
        {t("talentPoolGoAssessment")}
      </Link>
    </div>
  );
}
