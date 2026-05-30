import type { CV } from "@prisma/client";
import { z } from "zod";

export const tailoredExperienceRowSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().max(200),
  description: z.string().min(1).max(8000),
});

export const tailoredEducationRowSchema = z.object({
  degree: z.string().min(1).max(400),
  institution: z.string().min(1).max(400),
});

export const tailoredCvDraftSchema = z.object({
  professionalTitle: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  experience: z.array(tailoredExperienceRowSchema).min(1),
  education: z.array(tailoredEducationRowSchema).min(1),
  skills: z.array(z.string().max(80)).max(45),
  languages: z.array(z.string()).max(20).optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
});

export const jdTailorResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  jobTitleDetected: z.string().max(200),
  companyDetected: z.string().max(200).optional(),
  keywordsMatched: z.array(z.string()).max(30),
  keywordsAdded: z.array(z.string()).max(30),
  matchSummary: z.string().max(2000),
  matchSummaryAr: z.string().max(2000),
  tailoredDraft: tailoredCvDraftSchema,
});

export type TailoredCvDraft = z.infer<typeof tailoredCvDraftSchema>;
export type JdTailorResult = z.infer<typeof jdTailorResultSchema>;

/** Build a Prisma-shaped CV row for PDF rendering without persisting. */
export function tailoredDraftToPdfCv(
  base: Pick<
    CV,
    | "id"
    | "userId"
    | "fullName"
    | "fullNameAr"
    | "email"
    | "phone"
    | "location"
    | "locationAr"
    | "linkedinUrl"
    | "portfolioUrl"
  >,
  tailored: TailoredCvDraft,
): CV {
  const now = new Date();
  return {
    id: base.id,
    userId: base.userId,
    fullName: base.fullName,
    fullNameAr: base.fullNameAr,
    professionalTitle: tailored.professionalTitle,
    professionalTitleAr: null,
    email: base.email,
    phone: base.phone,
    location: base.location,
    locationAr: base.locationAr,
    linkedinUrl: base.linkedinUrl,
    portfolioUrl: base.portfolioUrl,
    summary: tailored.summary,
    summaryAr: null,
    experience: tailored.experience,
    education: tailored.education,
    skills: tailored.skills,
    languages: tailored.languages ?? [],
    certifications: tailored.certifications ?? [],
    atsScore: null,
    atsAnalysis: null,
    atsKeywords: null,
    atsSuggestions: null,
    uploadedCvUrl: null,
    generatedCvUrl: null,
    template: "professional",
    isComplete: true,
    completionPct: 100,
    lastParsed: null,
    createdAt: now,
    updatedAt: now,
  };
}
