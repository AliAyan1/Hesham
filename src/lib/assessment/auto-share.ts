import { AssessmentStatus, type PrismaClient } from "@prisma/client";

/** Completed assessments are always visible to employers (no opt-out). */
export async function shareCompletedAssessmentsForUser(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.assessment.updateMany({
    where: {
      userId,
      status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
    },
    data: { shareWithEmployers: true },
  });
}
