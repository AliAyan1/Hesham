import {
  AssessmentStatus,
  InterviewStatus,
  TalentPoolReason,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { addTalentPoolEntry } from "@/lib/talent-pool/add-talent-pool-entry";
import { proctoringCooldownUntil } from "@/lib/assessment/proctoring-policy";

export type ApplyProctoringSuspensionInput = {
  userId: string;
  userName: string | null;
  assessmentId?: string;
  interviewId?: string;
  violationSummary: string;
  warningCount: number;
  proctoringFlags: Record<string, unknown>;
};

export type ApplyProctoringSuspensionResult = {
  cooldownUntil: Date;
  talentPoolAdded: boolean;
};

/**
 * After the 3rd proctoring strike: flag session, add talent pool entry, block retakes for 24h.
 */
export async function applyProctoringSuspension(
  input: ApplyProctoringSuspensionInput,
): Promise<ApplyProctoringSuspensionResult> {
  const prisma = getPrisma();
  const cooldownUntil = proctoringCooldownUntil();
  const flagsPayload = {
    ...input.proctoringFlags,
    maxWarnings: 3,
    warningCount: input.warningCount,
    violationSummary: input.violationSummary,
    suspendedAt: new Date().toISOString(),
    cooldownUntil: cooldownUntil.toISOString(),
  };

  if (input.assessmentId) {
    await prisma.assessment.updateMany({
      where: { id: input.assessmentId, userId: input.userId },
      data: {
        status: AssessmentStatus.FLAGGED,
        isFlagged: true,
        flagReason: input.violationSummary,
        proctoringFlags: flagsPayload as object,
        completedAt: new Date(),
      },
    });
  }

  if (input.interviewId) {
    await prisma.videoInterview.updateMany({
      where: { id: input.interviewId, userId: input.userId },
      data: {
        status: InterviewStatus.FLAGGED,
        isFlagged: true,
        proctoringFlags: flagsPayload as object,
        completedAt: new Date(),
      },
    });
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { proctoringSuspendedUntil: cooldownUntil },
  });

  let talentPoolAdded = false;
  const recentPool = await prisma.talentPoolEntry.findFirst({
    where: {
      userId: input.userId,
      reason: TalentPoolReason.PROCTORING_VIOLATION,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  if (!recentPool) {
    await addTalentPoolEntry({
      userId: input.userId,
      reason: TalentPoolReason.PROCTORING_VIOLATION,
      improvements: [
        {
          title: "Proctoring compliance — reassessment after 24 hours",
        },
      ],
    });
    talentPoolAdded = true;
  }

  const untilLabel = cooldownUntil.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await createUserNotification({
    userId: input.userId,
    title: "Assessment paused — talent pool",
    titleAr: "تم إيقاف التقييم — مجموعة المواهب",
    message: `You were moved to the talent pool due to proctoring violations (${input.warningCount} warnings). You may retake your assessment after 24 hours (${untilLabel}).`,
    messageAr: `تم نقلك إلى مجموعة المواهب بسبب مخالفات المراقبة. يمكنك إعادة التقييم بعد 24 ساعة.`,
    type: "ASSESSMENT_FLAGGED",
    link: "/dashboard/job-seeker/assessment",
  });

  return { cooldownUntil, talentPoolAdded };
}

export async function getProctoringSuspensionForUser(userId: string): Promise<Date | null> {
  const { resolveProctoringSuspendedUntil } = await import(
    "@/lib/talent-pool/talent-pool-server"
  );
  return resolveProctoringSuspendedUntil(userId);
}
