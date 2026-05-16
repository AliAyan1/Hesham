import { AssessmentType } from "@prisma/client";

const SLUG_TO_TYPE: Record<string, AssessmentType> = {
  general: AssessmentType.GENERAL,
  technical: AssessmentType.TECHNICAL,
  behavioral: AssessmentType.BEHAVIORAL,
  communication: AssessmentType.COMMUNICATION,
  industry: AssessmentType.INDUSTRY_SPECIFIC,
};

const TYPE_TO_SLUG: Record<AssessmentType, string> = {
  [AssessmentType.GENERAL]: "general",
  [AssessmentType.TECHNICAL]: "technical",
  [AssessmentType.BEHAVIORAL]: "behavioral",
  [AssessmentType.COMMUNICATION]: "communication",
  [AssessmentType.INDUSTRY_SPECIFIC]: "industry",
};

export function assessmentTypeFromSlug(slug: string): AssessmentType | null {
  const key = slug.toLowerCase();
  return SLUG_TO_TYPE[key] ?? null;
}

export function slugFromAssessmentType(type: AssessmentType): string {
  return TYPE_TO_SLUG[type] ?? "general";
}
