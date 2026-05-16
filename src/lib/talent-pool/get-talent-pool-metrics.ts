import { AssessmentStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { computeProfilePageCompletionFromRecords } from "@/lib/profile-page-completion";
import type { TalentPoolMetrics } from "@/lib/talent-pool/talent-pool-criteria";

export async function getTalentPoolMetrics(userId: string): Promise<TalentPoolMetrics> {
  const prisma = getPrisma();
  const [assessment, cv, profile, user] = await Promise.all([
    prisma.assessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        totalScore: true,
        stepsCompleted: true,
        isFlagged: true,
      },
    }),
    prisma.cV.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    }),
  ]);

  const assessmentComplete =
    assessment?.status === AssessmentStatus.COMPLETED && assessment.isFlagged === false;
  const assessmentScore =
    assessmentComplete && assessment.totalScore != null ? assessment.totalScore : null;

  const profileCompletion =
    cv?.completionPct ??
    computeProfilePageCompletionFromRecords({
      hasProfilePhoto: Boolean(user?.image?.trim()),
      name: user?.name ?? null,
      profile,
      cv,
    });

  const atsScore = cv?.atsScore ?? profile?.atsScore ?? null;

  return {
    assessmentScore,
    assessmentComplete,
    stepsCompleted: assessment?.stepsCompleted ?? 0,
    profileCompletion,
    atsScore,
  };
}
