import { getPrisma } from "@/lib/db";
import { getTalentPoolMetrics } from "@/lib/talent-pool/get-talent-pool-metrics";
import { meetsTalentPoolExitCriteria } from "@/lib/talent-pool/talent-pool-criteria";
import { removeFromTalentPoolAsActive } from "@/lib/talent-pool/remove-from-talent-pool";

/** If user meets all active-candidate criteria, remove from talent pool and notify. */
export async function evaluateTalentPoolExit(userId: string): Promise<boolean> {
  const prisma = getPrisma();
  const inPool = await prisma.user.findUnique({
    where: { id: userId },
    select: { inTalentPool: true },
  });
  if (!inPool?.inTalentPool) return false;

  const metrics = await getTalentPoolMetrics(userId);
  if (!meetsTalentPoolExitCriteria(metrics)) return false;

  const pendingInvites = await prisma.talentPoolInvite.findMany({
    where: {
      candidateId: userId,
      status: { in: ["PENDING_ASSESSMENT", "ASSESSMENT_COMPLETE"] },
    },
    select: { employerId: true, job: { select: { title: true } } },
  });

  const employerIds = [...new Set(pendingInvites.map((i) => i.employerId))];
  const jobTitle = pendingInvites[0]?.job.title ?? "open roles";

  return removeFromTalentPoolAsActive({
    userId,
    notifyCandidate: true,
    notifyEmployerIds: employerIds,
    jobTitleForEmployer: jobTitle,
  });
}
