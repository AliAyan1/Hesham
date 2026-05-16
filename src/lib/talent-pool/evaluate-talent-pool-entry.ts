import {
  ApplicationStatus,
  TalentPoolReason,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { ASSESSMENT_PASS_SCORE } from "@/lib/assessment/steps";
import { addTalentPoolEntry } from "@/lib/talent-pool/add-talent-pool-entry";
import { getTalentPoolMetrics } from "@/lib/talent-pool/get-talent-pool-metrics";
import { evaluateTalentPoolExit } from "@/lib/talent-pool/evaluate-talent-pool-exit";
import { syncUserTalentPoolFlags } from "@/lib/talent-pool/sync-user-talent-pool";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Run all automatic entry checks for a job seeker (idempotent). */
export async function evaluateTalentPoolEntry(userId: string): Promise<void> {
  const prisma = getPrisma();

  await prisma.talentPoolEntry.deleteMany({
    where: { userId, reason: TalentPoolReason.NO_ASSESSMENT },
  });
  await syncUserTalentPoolFlags(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inTalentPool: true },
  });
  if (!user) return;

  if (user.inTalentPool) {
    await evaluateTalentPoolExit(userId);
    return;
  }

  const metrics = await getTalentPoolMetrics(userId);

  if (
    metrics.assessmentComplete &&
    metrics.assessmentScore != null &&
    metrics.assessmentScore < ASSESSMENT_PASS_SCORE
  ) {
    await addTalentPoolEntry({ userId, reason: TalentPoolReason.ASSESSMENT_LOW_SCORE });
    return;
  }

  const staleApps = await prisma.application.findMany({
    where: {
      jobSeekerId: userId,
      status: { in: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWED, ApplicationStatus.SHORTLISTED] },
      createdAt: { lte: new Date(Date.now() - THIRTY_DAYS_MS) },
    },
    select: { id: true },
    take: 5,
  });

  for (const app of staleApps) {
    await addTalentPoolEntry({
      userId,
      reason: TalentPoolReason.NOT_SELECTED_30_DAYS,
      sourceApplicationId: app.id,
    });
  }
}

/** After assessment completion — low score entry or exit if improved. */
export async function onAssessmentCompletedForTalentPool(
  userId: string,
  overallScore: number,
): Promise<void> {
  if (overallScore < ASSESSMENT_PASS_SCORE) {
    await addTalentPoolEntry({ userId, reason: TalentPoolReason.ASSESSMENT_LOW_SCORE });
    return;
  }
  await evaluateTalentPoolExit(userId);
}
