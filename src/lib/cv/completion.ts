import type { CV } from "@prisma/client";

export type CvCompletionInput = {
  cv: CV | null;
  hasProfilePhoto: boolean;
};

export function computeCvCompletionPercent(input: CvCompletionInput): number {
  const { cv, hasProfilePhoto } = input;
  if (!cv) return 0;

  let pts = 0;

  // Personal info: 20pts
  const personalOk =
    Boolean(cv.fullName?.trim()) &&
    Boolean(cv.email?.trim()) &&
    Boolean(cv.phone?.trim()) &&
    Boolean(cv.professionalTitle?.trim());
  if (personalOk) pts += 20;

  // Profile photo: 10pts
  if (hasProfilePhoto) pts += 10;

  // Work experience (1+): 20pts
  const exp = Array.isArray(cv.experience) ? (cv.experience as unknown[]) : null;
  if (exp && exp.length > 0) pts += 20;

  // Education (1+): 15pts
  const edu = Array.isArray(cv.education) ? (cv.education as unknown[]) : null;
  if (edu && edu.length > 0) pts += 15;

  // Skills (3+): 15pts
  const skills = Array.isArray(cv.skills) ? (cv.skills as unknown[]) : null;
  if (skills && skills.length >= 3) pts += 15;

  // Languages (1+): 10pts
  const langs = Array.isArray(cv.languages) ? (cv.languages as unknown[]) : null;
  if (langs && langs.length > 0) pts += 10;

  // Summary: 10pts
  if (cv.summary?.trim()) pts += 10;

  return Math.max(0, Math.min(100, pts));
}

