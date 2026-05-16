"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { EmployerTalentPoolMemberDto } from "@/app/api/employer/talent-pool/[userId]/route";
import { CandidateCvProfileSections } from "@/components/employer/CandidateCvProfileSections";
import { SendTalentPoolInviteModal } from "@/components/employer/SendTalentPoolInviteModal";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { talentPoolReasonLabelKey } from "@/lib/talent-pool/reason-label-key";

export function EmployerTalentPoolMemberClient({ userId }: { userId: string }) {
  const t = useTranslations("employerTalentPool");
  const tec = useTranslations("employerCandidates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";
  const [data, setData] = useState<EmployerTalentPoolMemberDto | null>(null);
  const [err, setErr] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    let cancel = false;
    void axios
      .get<{ success: boolean; data: EmployerTalentPoolMemberDto }>(
        `/api/employer/talent-pool/${encodeURIComponent(userId)}`,
      )
      .then((res) => {
        if (!cancel && res.data.success) setData(res.data.data);
        else if (!cancel) setErr(true);
      })
      .catch(() => {
        if (!cancel) setErr(true);
      });
    return () => {
      cancel = true;
    };
  }, [userId]);

  if (err) {
    return (
      <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={() => window.location.reload()} />
    );
  }
  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  const candidateName = data.name?.trim() || data.email;

  return (
    <div className="space-y-6">
      <SendTalentPoolInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        candidateId={data.userId}
        candidateName={candidateName}
      />
      <Link href="/dashboard/employer/talent-pool" className="text-sm font-semibold text-brand-teal underline">
        {t("backPool")}
      </Link>

      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
        <InitialsAvatar name={data.name} email={data.email} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-[#0D2137]">{data.name?.trim() || data.email}</h2>
          <p className="text-sm text-[#6B7280]">{data.email}</p>
          {data.professionalTitle ? (
            <p className="mt-2 text-sm font-medium text-[#374151]">{data.professionalTitle}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <p>
              <span className="font-medium text-[#374151]">{t("colAs")}: </span>
              {data.assessmentScore ?? "—"}
            </p>
            <p>
              <span className="font-medium text-[#374151]">{t("colIv")}: </span>
              {data.interviewScore ?? "—"}
            </p>
          </div>
          {data.poolReason ? (
            <div className="mt-3 space-y-1 text-xs text-[#6B7280]">
              <p>
                {t("profilePool")}: {t(talentPoolReasonLabelKey(data.poolReason))}
              </p>
              {data.poolReason === "PROCTORING_VIOLATION" ? (
                <p className={data.proctoringCooldownActive ? "text-rose-800" : "text-emerald-800"}>
                  {data.proctoringCooldownActive && data.proctoringSuspendedUntil
                    ? t("statusCooldown", {
                        datetime: new Date(data.proctoringSuspendedUntil).toLocaleString(
                          isRtl ? "ar" : "en-GB",
                          { dateStyle: "medium", timeStyle: "short" },
                        ),
                      })
                    : t("statusReassessmentReady")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/employer/messages?to=${encodeURIComponent(data.userId)}`}
          className="inline-flex min-h-11 items-center rounded-lg bg-brand-teal px-4 text-sm font-semibold text-white"
        >
          {t("messageCandidate")}
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#7C3AED] px-4 text-sm font-semibold text-[#7C3AED]"
          onClick={() => setInviteOpen(true)}
        >
          {t("nominate")}
        </button>
      </div>

      {data.sharedAssessment && data.sharedAssessment.totalScore != null ? (
        <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
          <h2 className="font-bold text-[#0D2137]">{tec("assessmentSection")}</h2>
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-2xl font-bold text-brand-teal">{data.sharedAssessment.totalScore}/100</p>
            <p className="text-xs text-[#6B7280]">
              Skills {data.sharedAssessment.skillsScore ?? "—"} · Comm{" "}
              {data.sharedAssessment.communicationScore ?? "—"} · Beh{" "}
              {data.sharedAssessment.behavioralScore ?? "—"} · Industry{" "}
              {data.sharedAssessment.industryFitScore ?? "—"}
            </p>
            {data.sharedAssessment.isFlagged ? (
              <p className="text-xs font-semibold text-amber-800">{t("profileAssessmentFlagged")}</p>
            ) : (
              <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {tec("verifiedAssessment")}
              </p>
            )}
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#374151]">
              {Array.isArray(data.sharedAssessment.strengths)
                ? (data.sharedAssessment.strengths as { title?: string; description?: string }[])
                    .slice(0, 5)
                    .map((s, i) => (
                      <li key={`${s.title ?? i}`}>
                        {(s.title ?? "").trim()}
                        {s.description ? `: ${s.description.trim()}` : ""}
                      </li>
                    ))
                : null}
            </ul>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-bold text-[#0D2137]">{t("profileCvHeading")}</h2>
        <CandidateCvProfileSections cv={data.cv} profile={data.profile} showContactLinks />
      </section>
    </div>
  );
}
