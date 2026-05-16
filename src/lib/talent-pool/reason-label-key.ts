import type { TalentPoolReason } from "@prisma/client";

/** i18n keys under `employerTalentPool` */
export function talentPoolReasonLabelKey(
  reason: string | null | undefined,
):
  | "reasonInterview"
  | "reasonDeclined"
  | "reasonProctoring"
  | "reasonAssessmentLow"
  | "reasonNoAssessment"
  | "reasonNotSelected30" {
  if (reason === "PROCTORING_VIOLATION") return "reasonProctoring";
  if (reason === "EMPLOYER_DECLINED") return "reasonDeclined";
  if (reason === "ASSESSMENT_LOW_SCORE") return "reasonAssessmentLow";
  if (reason === "NO_ASSESSMENT") return "reasonNoAssessment";
  if (reason === "NOT_SELECTED_30_DAYS") return "reasonNotSelected30";
  return "reasonInterview";
}

export function isTalentPoolReason(value: string): value is TalentPoolReason {
  return (
    value === "INTERVIEW_LOW_SCORE" ||
    value === "EMPLOYER_DECLINED" ||
    value === "PROCTORING_VIOLATION" ||
    value === "ASSESSMENT_LOW_SCORE" ||
    value === "NO_ASSESSMENT" ||
    value === "NOT_SELECTED_30_DAYS"
  );
}
