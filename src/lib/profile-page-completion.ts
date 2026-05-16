import type { CV, Profile } from "@prisma/client";
import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";

/**
 * Job recommendation AI match % is hidden until at least this much of “My Profile” is complete,
 * so empty profiles never show fabricated match scores.
 */
export const MIN_PROFILE_COMPLETION_FOR_AI_JOB_MATCH = 40;

export type ProfilePagePrefs = {
  desiredJobTitle: string;
  preferredCategories: string[];
  preferredLocation: string;
  preferredJobTypes: string[];
  availableFrom: string;
};

export type ProfilePageCompletionInput = {
  hasProfilePhoto: boolean;
  name: string;
  phone: string;
  location: string;
  bio: string;
  professionalTitle: string;
  summary: string;
  experience: { title: string; company: string; description: string }[];
  education: { degree: string; institution: string }[];
  skillsCount: number;
  languagesCount: number;
  prefs: ProfilePagePrefs;
};

function countJsonArray(val: unknown): number {
  return Array.isArray(val) ? val.length : 0;
}

/** Eight sections on My Profile — each must be complete for 100%. Certifications are optional. */
export function computeProfilePageCompletionPercent(input: ProfilePageCompletionInput): number {
  const sections: boolean[] = [
    input.hasProfilePhoto,
    Boolean(input.phone.trim() && input.location.trim() && input.bio.trim()),
    Boolean(input.professionalTitle.trim() && input.summary.trim().length >= 40),
    input.experience.some((e) => e.title.trim() && e.company.trim()),
    input.education.some((e) => e.degree.trim() && e.institution.trim()),
    input.skillsCount >= 3,
    input.languagesCount >= 1,
    Boolean(
      input.prefs.desiredJobTitle.trim() &&
        input.prefs.preferredCategories.length > 0 &&
        input.prefs.preferredLocation.trim() &&
        input.prefs.preferredJobTypes.length > 0 &&
        input.prefs.availableFrom.trim(),
    ),
  ];

  const done = sections.filter(Boolean).length;
  return Math.round((done / sections.length) * 100);
}

export type ProfilePageSectionKey =
  | "photo"
  | "personal"
  | "cvHeadline"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "jobPrefs";

export function getProfilePageSections(
  input: ProfilePageCompletionInput,
): { key: ProfilePageSectionKey; done: boolean }[] {
  return [
    { key: "photo", done: input.hasProfilePhoto },
    {
      key: "personal",
      done: Boolean(input.phone.trim() && input.location.trim() && input.bio.trim()),
    },
    {
      key: "cvHeadline",
      done: Boolean(input.professionalTitle.trim() && input.summary.trim().length >= 40),
    },
    {
      key: "experience",
      done: input.experience.some((e) => e.title.trim() && e.company.trim()),
    },
    {
      key: "education",
      done: input.education.some((e) => e.degree.trim() && e.institution.trim()),
    },
    { key: "skills", done: input.skillsCount >= 3 },
    { key: "languages", done: input.languagesCount >= 1 },
    {
      key: "jobPrefs",
      done: Boolean(
        input.prefs.desiredJobTitle.trim() &&
          input.prefs.preferredCategories.length > 0 &&
          input.prefs.preferredLocation.trim() &&
          input.prefs.preferredJobTypes.length > 0 &&
          input.prefs.availableFrom.trim(),
      ),
    },
  ];
}

export function computeProfilePageCompletionFromRecords(input: {
  hasProfilePhoto: boolean;
  name: string | null;
  profile: Profile | null;
  cv: CV | null;
}): number {
  const { profile, cv } = input;
  const prefsRaw = profile?.jobPreferences;
  const prefsObj =
    prefsRaw && typeof prefsRaw === "object" && !Array.isArray(prefsRaw)
      ? (prefsRaw as Record<string, unknown>)
      : {};

  const preferredCategories = Array.isArray(prefsObj.preferredCategories)
    ? prefsObj.preferredCategories.filter((x): x is string => typeof x === "string")
    : [];
  const preferredJobTypes = Array.isArray(prefsObj.preferredJobTypes)
    ? prefsObj.preferredJobTypes.filter((x): x is string => typeof x === "string")
    : [];

  const experience = Array.isArray(cv?.experience)
    ? (cv!.experience as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          title: typeof r.title === "string" ? r.title : "",
          company: typeof r.company === "string" ? r.company : "",
          description: mergeExperienceDescriptionFromRecord(r),
        };
      })
    : [];

  const education = Array.isArray(cv?.education)
    ? (cv!.education as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          degree: typeof r.degree === "string" ? r.degree : "",
          institution: typeof r.institution === "string" ? r.institution : "",
        };
      })
    : [];

  return computeProfilePageCompletionPercent({
    hasProfilePhoto: input.hasProfilePhoto,
    name: input.name?.trim() ?? "",
    phone: profile?.phone?.trim() ?? "",
    location: profile?.location?.trim() ?? "",
    bio: profile?.bio?.trim() ?? "",
    professionalTitle: cv?.professionalTitle?.trim() ?? "",
    summary: cv?.summary?.trim() ?? "",
    experience,
    education,
    skillsCount: countJsonArray(cv?.skills),
    languagesCount: countJsonArray(cv?.languages),
    prefs: {
      desiredJobTitle: typeof prefsObj.desiredJobTitle === "string" ? prefsObj.desiredJobTitle : "",
      preferredCategories,
      preferredLocation: typeof prefsObj.preferredLocation === "string" ? prefsObj.preferredLocation : "",
      preferredJobTypes,
      availableFrom: typeof prefsObj.availableFrom === "string" ? prefsObj.availableFrom : "",
    },
  });
}
