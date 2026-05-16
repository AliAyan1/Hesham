/** Client-safe talent pool types (no Prisma / DB imports). */

import type { TalentPoolProgress } from "@/lib/talent-pool/talent-pool-criteria";

export type TalentPoolReasonCode =
  | "INTERVIEW_LOW_SCORE"
  | "EMPLOYER_DECLINED"
  | "PROCTORING_VIOLATION"
  | "ASSESSMENT_LOW_SCORE"
  | "NO_ASSESSMENT"
  | "NOT_SELECTED_30_DAYS";

export type JobSeekerTalentPoolStatus = {
  inTalentPool: boolean;
  reason: TalentPoolReasonCode | null;
  poolEntryAt: string | null;
  proctoringSuspended: boolean;
  proctoringSuspendedUntil: string | null;
  progress: TalentPoolProgress | null;
};

export type TalentPoolInviteDto = {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export function isProctoringTalentPoolReason(reason: string | null | undefined): boolean {
  return reason === "PROCTORING_VIOLATION";
}
