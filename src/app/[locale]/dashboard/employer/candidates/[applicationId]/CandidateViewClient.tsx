"use client";

import axios from "axios";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { EmployerCandidatePayload } from "@/types";
import { ApplicationStatus } from "@/types";
import { Link } from "@/i18n/navigation";
import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { OfferUploadSection } from "@/components/employer/OfferUploadSection";

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeExperience(raw: unknown): Array<{ title: string; company: string; description: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return { title: "", company: "", description: "" };
      const r = item as Record<string, unknown>;
      const title = pickStr(r, "title", "jobTitle", "position", "role") ?? "";
      const company = pickStr(r, "company", "employer", "organization") ?? "";
      const description = mergeExperienceDescriptionFromRecord(r);
      return { title, company, description };
    })
    .filter((x) => x.title || x.company || x.description);
}

function normalizeEducation(raw: unknown): Array<{ degree: string; institution: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return { degree: "", institution: "" };
      const r = item as Record<string, unknown>;
      return {
        degree: pickStr(r, "degree", "field", "qualification") ?? "",
        institution: pickStr(r, "institution", "school", "university", "college") ?? "",
      };
    })
    .filter((x) => x.degree || x.institution);
}

function asSkillLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (typeof x === "string" && x.trim()) return x.trim();
      if (x && typeof x === "object") {
        const r = x as Record<string, unknown>;
        return pickStr(r, "name", "skill", "label") ?? "";
      }
      return "";
    })
    .filter(Boolean);
}

function asStringLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((x) => {
    if (typeof x === "string" && x.trim()) return [x.trim()];
    if (x && typeof x === "object") {
      const r = x as Record<string, unknown>;
      const name = pickStr(r, "name", "language", "label", "title");
      const level = pickStr(r, "level", "proficiency");
      if (name && level) return [`${name} (${level})`];
      if (name) return [name];
      const issuer = pickStr(r, "issuer", "organization");
      const combined = [name, issuer].filter(Boolean).join(" · ");
      if (combined) return [combined];
    }
    return [];
  });
}

const outlineLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-brand-blue bg-transparent px-4 text-sm font-medium text-brand-blue transition-colors hover:bg-brand-lightBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 focus-visible:ring-offset-2";

export function CandidateViewClient({ applicationId }: { applicationId: string }) {
  const tec = useTranslations("employerCandidates");
  const tCv = useTranslations("cv");
  const dash = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tj = useTranslations("jobs");

  const [data, setData] = useState<EmployerCandidatePayload | null>(null);
  const [err, setErr] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    void axios
      .get<{ success: boolean; data: EmployerCandidatePayload }>(
        `/api/employer/applications/${encodeURIComponent(applicationId)}/candidate`,
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
  }, [applicationId]);

  const experienceRows = useMemo(() => normalizeExperience(data?.candidate.cv?.experience), [data]);
  const educationRows = useMemo(() => normalizeEducation(data?.candidate.cv?.education), [data]);
  const skillLabels = useMemo(() => asSkillLabels(data?.candidate.cv?.skills), [data]);
  const languageLines = useMemo(() => asStringLines(data?.candidate.cv?.languages), [data]);
  const certificationLines = useMemo(() => asStringLines(data?.candidate.cv?.certifications), [data]);

  if (!data && err)
    return <ErrorState title={dash("dashboardLoadError")} retryLabel={tc("retry")} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  const c = data.candidate;
  const cv = c.cv;
  const summaryText = cv?.summary ?? c.profile?.bio ?? tc("emDash");
  const unlocked = data.contactUnlocked;

  async function applyStatus(next: ApplicationStatus, reason?: string) {
    setStatusSaving(true);
    try {
      await axios.patch(`/api/employer/applications/${encodeURIComponent(applicationId)}`, {
        status: next,
        ...(next === ApplicationStatus.REJECTED && reason ? { declineReason: reason } : {}),
      });
      const res = await axios.get<{ success: boolean; data: EmployerCandidatePayload }>(
        `/api/employer/applications/${encodeURIComponent(applicationId)}/candidate`,
      );
      if (res.data.success) setData(res.data.data);
    } finally {
      setStatusSaving(false);
    }
  }

  function onStatusPick(next: ApplicationStatus) {
    if (next === ApplicationStatus.REJECTED) {
      setDeclineReason("");
      setRejectOpen(true);
      return;
    }
    void applyStatus(next);
  }

  async function confirmReject() {
    if (!declineReason.trim()) return;
    await applyStatus(ApplicationStatus.REJECTED, declineReason.trim());
    setRejectOpen(false);
  }

  return (
    <div className="space-y-6">
      {rejectOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#0D2137]">{tec("declineModalTitle")}</h3>
            <label className="mt-4 block text-sm font-medium text-[#374151]">{tec("declineReasonLabel")}</label>
            <textarea
              className="mt-2 w-full rounded-lg border p-3 text-sm"
              rows={5}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={tec("declineReasonPlaceholder")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                {tec("declineCancel")}
              </Button>
              <Button
                type="button"
                loading={statusSaving}
                disabled={!declineReason.trim()}
                onClick={() => void confirmReject()}
              >
                {tec("declineSubmit")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/employer/candidates" className={outlineLinkClass}>
          {tec("backToList")}
        </Link>
        <p className="text-sm text-[#6B7280]">
          {tec("appliedFor")}{" "}
          <span className="font-semibold text-[#0D2137]">{data.appliedForJobTitle}</span>
        </p>
      </div>

      <header className="rounded-xl border bg-white p-6 shadow-sm">
        {!unlocked ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {tec("contactLockedBanner")}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold text-[#0D2137]">{c.name?.trim() || c.email || "—"}</h1>
        <p className="text-sm text-[#6B7280]">{unlocked ? c.email : tec("contactHiddenHint")}</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {c.profile?.phone && unlocked ? (
            <p>
              <span className="font-medium text-[#374151]">{tCv("fields.phone")}: </span>
              {c.profile.phone}
            </p>
          ) : null}
          {c.profile?.location ? (
            <p>
              <span className="font-medium text-[#374151]">{tCv("fields.location")}: </span>
              {c.profile.location}
            </p>
          ) : null}
          {c.profile?.nationality ? (
            <p>
              <span className="font-medium text-[#374151]">{tec("nationalityLabel")}: </span>
              {c.profile.nationality}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/employer/applications/${encodeURIComponent(applicationId)}/cv-pdf`}
          className={outlineLinkClass}
          target="_blank"
          rel="noreferrer"
        >
          {tec("downloadCv")}
        </a>
        <Link
          href={`/dashboard/employer/messages?to=${encodeURIComponent(c.id)}`}
          className={outlineLinkClass}
        >
          {tec("messageCandidate")}
        </Link>
      </div>

      {(data.applicationStatus === ApplicationStatus.SHORTLISTED ||
        data.applicationStatus === ApplicationStatus.HIRED) && (
        <OfferUploadSection
          applicationId={applicationId}
          candidateName={c.name?.trim() || c.email || "Candidate"}
        />
      )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{tec("applicationStatus")}</h2>
        <select
          className="mt-3 min-h-11 rounded-lg border bg-white px-3 text-sm"
          value={data.applicationStatus}
          disabled={statusSaving}
          onChange={(e) => {
            const v = e.target.value as ApplicationStatus;
            void onStatusPick(v);
          }}
        >
          {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {tj(`status.${s.toLowerCase()}` as never)}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{tec("assessmentSection")}</h2>
        {data.sharedAssessment && data.sharedAssessment.totalScore != null ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-2xl font-bold text-brand-teal">
              {Math.round(data.sharedAssessment.overallScore ?? data.sharedAssessment.totalScore ?? 0)}% {tec("overallFit")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-[#F9FAFB] p-3 text-center">
                <p className="text-xs text-[#6B7280]">{tec("thinkingFit")}</p>
                <p className="font-bold text-[#0F4C75]">
                  {data.sharedAssessment.thinkingStyleScore != null
                    ? `${Math.round(data.sharedAssessment.thinkingStyleScore)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3 text-center">
                <p className="text-xs text-[#6B7280]">{tec("behavioralFit")}</p>
                <p className="font-bold text-[#0F4C75]">
                  {data.sharedAssessment.behavioralScore != null
                    ? `${Math.round(data.sharedAssessment.behavioralScore)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3 text-center">
                <p className="text-xs text-[#6B7280]">{tec("interestsFit")}</p>
                <p className="font-bold text-[#0F4C75]">
                  {data.sharedAssessment.interestsScore != null
                    ? `${Math.round(data.sharedAssessment.interestsScore)}%`
                    : "—"}
                </p>
              </div>
            </div>
            {Array.isArray(data.sharedAssessment.topJobMatches) &&
            (data.sharedAssessment.topJobMatches as { role?: string; fitPercentage?: number }[]).length > 0 ? (
              <p className="text-sm text-[#374151]">
                {tec("recommendedRole")}:{" "}
                {(data.sharedAssessment.topJobMatches as { role?: string; fitPercentage?: number }[])[0]?.role ?? "—"}{" "}
                (
                {(data.sharedAssessment.topJobMatches as { fitPercentage?: number }[])[0]?.fitPercentage ?? "—"}%)
              </p>
            ) : null}
            <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {tec("verifiedAssessment")}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#374151]">
              {(() => {
                const report = data.sharedAssessment.writtenReport as {
                  overallProfile?: { keyStrengths?: string[] };
                } | null;
                const fromReport = report?.overallProfile?.keyStrengths?.slice(0, 3) ?? [];
                if (fromReport.length) return fromReport.map((s) => <li key={s}>{s}</li>);
                return Array.isArray(data.sharedAssessment.strengths)
                  ? (data.sharedAssessment.strengths as { title?: string; description?: string }[])
                      .slice(0, 3)
                      .map((s, i) => (
                        <li key={`${s.title ?? i}`}>
                          {(s.title ?? "").trim()}: {(s.description ?? "").trim()}
                        </li>
                      ))
                  : null;
              })()}
            </ul>
            <a
              href={`/api/assessment/download-report?id=${encodeURIComponent(data.sharedAssessment.id)}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0F4C75] px-4 text-xs font-semibold text-white"
            >
              {tec("downloadAssessmentReport")}
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6B7280]">{tec("noSharedAssessment")}</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{tec("interviewSection")}</h2>
        {data.sharedInterview && data.sharedInterview.overallScore != null ? (
          <div className="mt-3 space-y-4 text-sm">
            <p className="text-xl font-bold text-brand-teal">{data.sharedInterview.overallScore}/100</p>
            <p className="text-xs text-[#6B7280]">
              Comm {data.sharedInterview.communicationScore ?? "—"} · Conf {data.sharedInterview.confidenceScore ?? "—"} ·
              Clarity {data.sharedInterview.clarityScore ?? "—"} · Rel {data.sharedInterview.relevanceScore ?? "—"}
            </p>
            {(() => {
              const ai = data.sharedInterview.aiAnalysis;
              const feedback =
                ai && typeof ai === "object" && "overallFeedback" in ai && typeof (ai as { overallFeedback: unknown }).overallFeedback === "string"
                  ? (ai as { overallFeedback: string }).overallFeedback.trim()
                  : "";
              return feedback ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{tec("interviewOverallFeedback")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[#374151]">{feedback}</p>
                </div>
              ) : null;
            })()}
            {Array.isArray(data.sharedInterview.transcripts) && data.sharedInterview.transcripts.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{tec("interviewTranscripts")}</p>
                <ul className="mt-2 list-inside list-decimal space-y-2 text-[#374151]">
                  {(data.sharedInterview.transcripts as { questionId?: string; transcript?: string }[]).map((row, i) => (
                    <li key={row.questionId ?? i} className="whitespace-pre-wrap">
                      {(row.transcript ?? "").trim() || "—"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-brand-teal text-brand-teal hover:bg-brand-lightTeal/30"
              disabled={!data.sharedInterview.hasRecording}
              onClick={() => {
                const url = `/api/employer/applications/${encodeURIComponent(applicationId)}/interview-recording?interviewId=${encodeURIComponent(data.sharedInterview!.id)}`;
                void (async () => {
                  try {
                    const res = await fetch(url, { credentials: "include" });
                    if (!res.ok) return;
                    const blob = await res.blob();
                    const dl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = dl;
                    a.download = "candidate-interview.webm";
                    a.click();
                    URL.revokeObjectURL(dl);
                  } catch {
                    /* ignore */
                  }
                })();
              }}
            >
              {tec("downloadInterviewRecording")}
            </Button>
            <p className="text-xs text-[#6B7280]">{tec("downloadInterviewRecordingHint")}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6B7280]">{tec("noSharedInterview")}</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{tec("proctoringSection")}</h2>
        {(() => {
          const p = data.proctoringSummary;
          const n =
            p.tabSwitches + p.faceNotVisible + p.multipleFaces + p.copyPasteAttempts + p.aiToolDetected + p.sessionsFlagged;
          return n === 0 ? (
            <p className="mt-2 text-sm text-emerald-700">{tec("proctoringNoFlags")}</p>
          ) : (
            <p className="mt-2 text-sm text-amber-800">{tec("proctoringFlags", { count: String(n) })}</p>
          );
        })()}
      </section>

      {cv ? (
        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-bold text-[#0D2137]">
              {cv.professionalTitle?.trim() || tCv("fields.title")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151]">{summaryText}</p>
          </section>

          {cv.linkedinUrl && unlocked ? (
            <p className="text-sm">
              <span className="font-medium text-[#374151]">{tCv("fields.linkedin")}: </span>
              <a href={cv.linkedinUrl} className="text-brand-teal underline" target="_blank" rel="noreferrer">
                {cv.linkedinUrl}
              </a>
            </p>
          ) : null}
          {cv.portfolioUrl && unlocked ? (
            <p className="text-sm">
              <span className="font-medium text-[#374151]">{tCv("fields.portfolio")}: </span>
              <a href={cv.portfolioUrl} className="text-brand-teal underline" target="_blank" rel="noreferrer">
                {cv.portfolioUrl}
              </a>
            </p>
          ) : null}

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-bold text-[#0D2137]">{tCv("steps.experience")}</h3>
            {!experienceRows.length ? (
              <p className="mt-3 text-sm text-[#6B7280]">{tec("noExperience")}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {experienceRows.map((ex, idx) => (
                  <li key={`${ex.title}-${ex.company}-${idx}`} className="border-t border-[#EEF2F7] pt-4 first:border-t-0 first:pt-0">
                    <p className="font-semibold text-[#0D2137]">{ex.title || tCv("fields.jobTitle")}</p>
                    <p className="text-sm text-brand-teal">{ex.company}</p>
                    {ex.description ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151]">{ex.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-bold text-[#0D2137]">{tCv("steps.education")}</h3>
            {!educationRows.length ? (
              <p className="mt-3 text-sm text-[#6B7280]">{tec("noEducation")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {educationRows.map((ed, idx) => (
                  <li key={`${ed.degree}-${ed.institution}-${idx}`}>
                    <p className="font-semibold text-[#0D2137]">{ed.degree}</p>
                    <p className="text-sm text-[#6B7280]">{ed.institution}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-bold text-[#0D2137]">{tCv("skills.title")}</h3>
            {!skillLabels.length ? (
              <p className="mt-3 text-sm text-[#6B7280]">{tec("emptySection")}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {skillLabels.map((s) => (
                  <span key={s} className="rounded-full bg-brand-lightTeal px-3 py-1 text-xs font-semibold text-brand-teal">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </section>

          {languageLines.length ? (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="font-bold text-[#0D2137]">{tec("languagesHeading")}</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#374151]">
                {languageLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {certificationLines.length ? (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="font-bold text-[#0D2137]">{tec("certificationsHeading")}</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#374151]">
                {certificationLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[#6B7280]">{tec("noCvOnFile")}</p>
      )}
    </div>
  );
}
