"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  asSkillLabels,
  asStringLines,
  normalizeEducation,
  normalizeExperience,
  type CvProfileSlice,
} from "@/lib/cv/cv-profile-display";

type ProfileSlice = {
  bio: string | null;
  phone: string | null;
  location: string | null;
  nationality: string | null;
} | null;

export function CandidateCvProfileSections({
  cv,
  profile,
  showContactLinks = true,
}: {
  cv: CvProfileSlice | null;
  profile?: ProfileSlice;
  showContactLinks?: boolean;
}) {
  const tec = useTranslations("employerCandidates");
  const tCv = useTranslations("cv");

  const experienceRows = useMemo(() => normalizeExperience(cv?.experience), [cv?.experience]);
  const educationRows = useMemo(() => normalizeEducation(cv?.education), [cv?.education]);
  const skillLabels = useMemo(() => asSkillLabels(cv?.skills), [cv?.skills]);
  const languageLines = useMemo(() => asStringLines(cv?.languages), [cv?.languages]);
  const certificationLines = useMemo(() => asStringLines(cv?.certifications), [cv?.certifications]);

  const summaryText =
    cv?.summary?.trim() || profile?.bio?.trim() || tec("noSummary");

  if (!cv && !profile?.bio?.trim()) {
    return <p className="text-sm text-[#6B7280]">{tec("noCvOnFile")}</p>;
  }

  return (
    <div className="space-y-4">
      {profile && (profile.location || profile.phone || profile.nationality) ? (
        <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
          <h2 className="font-bold text-[#0D2137]">{tec("profileDetailsHeading")}</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {profile.location ? (
              <div>
                <dt className="font-medium text-[#6B7280]">{tec("locationLabel")}</dt>
                <dd className="text-[#374151]">{profile.location}</dd>
              </div>
            ) : null}
            {profile.phone ? (
              <div>
                <dt className="font-medium text-[#6B7280]">{tec("phoneLabel")}</dt>
                <dd className="text-[#374151]">{profile.phone}</dd>
              </div>
            ) : null}
            {profile.nationality ? (
              <div>
                <dt className="font-medium text-[#6B7280]">{tec("nationalityLabel")}</dt>
                <dd className="text-[#374151]">{profile.nationality}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {cv ? (
        <>
          <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h2 className="font-bold text-[#0D2137]">
              {cv.professionalTitle?.trim() || tCv("fields.title")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151]">{summaryText}</p>
          </section>

          {showContactLinks && cv.linkedinUrl ? (
            <p className="text-sm">
              <span className="font-medium text-[#374151]">{tCv("fields.linkedin")}: </span>
              <a href={cv.linkedinUrl} className="text-brand-teal underline" target="_blank" rel="noreferrer">
                {cv.linkedinUrl}
              </a>
            </p>
          ) : null}
          {showContactLinks && cv.portfolioUrl ? (
            <p className="text-sm">
              <span className="font-medium text-[#374151]">{tCv("fields.portfolio")}: </span>
              <a href={cv.portfolioUrl} className="text-brand-teal underline" target="_blank" rel="noreferrer">
                {cv.portfolioUrl}
              </a>
            </p>
          ) : null}

          <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-[#0D2137]">{tCv("steps.experience")}</h3>
            {!experienceRows.length ? (
              <p className="mt-3 text-sm text-[#6B7280]">{tec("noExperience")}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {experienceRows.map((ex, idx) => (
                  <li
                    key={`${ex.title}-${ex.company}-${idx}`}
                    className="border-t border-[#EEF2F7] pt-4 first:border-t-0 first:pt-0"
                  >
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

          <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
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

          <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-[#0D2137]">{tCv("skills.title")}</h3>
            {!skillLabels.length ? (
              <p className="mt-3 text-sm text-[#6B7280]">{tec("emptySection")}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {skillLabels.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-brand-lightTeal px-3 py-1 text-xs font-semibold text-brand-teal"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </section>

          {languageLines.length ? (
            <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
              <h3 className="font-bold text-[#0D2137]">{tec("languagesHeading")}</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#374151]">
                {languageLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {certificationLines.length ? (
            <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
              <h3 className="font-bold text-[#0D2137]">{tec("certificationsHeading")}</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#374151]">
                {certificationLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : profile?.bio?.trim() ? (
        <section className="rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
          <h2 className="font-bold text-[#0D2137]">{tec("profileDetailsHeading")}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151]">{profile.bio}</p>
        </section>
      ) : null}
    </div>
  );
}
