"use client";

import axios from "axios";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { EmployerCandidatePayload } from "@/types";
import { Link } from "@/i18n/navigation";
import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

  const [data, setData] = useState<EmployerCandidatePayload | null>(null);
  const [err, setErr] = useState(false);

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

  return (
    <div className="space-y-6">
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
        <h1 className="text-2xl font-bold text-[#0D2137]">{c.name?.trim() || c.email}</h1>
        <p className="text-sm text-[#6B7280]">{c.email}</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {c.profile?.phone ? (
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

      {cv ? (
        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-bold text-[#0D2137]">
              {cv.professionalTitle?.trim() || tCv("fields.title")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151]">{summaryText}</p>
          </section>

          {cv.linkedinUrl ? (
            <p className="text-sm">
              <span className="font-medium text-[#374151]">{tCv("fields.linkedin")}: </span>
              <a href={cv.linkedinUrl} className="text-brand-teal underline" target="_blank" rel="noreferrer">
                {cv.linkedinUrl}
              </a>
            </p>
          ) : null}
          {cv.portfolioUrl ? (
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
