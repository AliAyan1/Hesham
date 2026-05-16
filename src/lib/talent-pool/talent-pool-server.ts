import { getPrisma } from "@/lib/db";
import { isProctoringSuspended } from "@/lib/assessment/proctoring-policy";
import { buildTalentPoolProgress } from "@/lib/talent-pool/talent-pool-criteria";
import { getTalentPoolMetrics } from "@/lib/talent-pool/get-talent-pool-metrics";
import type { JobSeekerTalentPoolStatus } from "@/lib/talent-pool/talent-pool-types";

/** Clears expired suspension timestamp and returns active until date if still suspended. */
export async function resolveProctoringSuspendedUntil(userId: string): Promise<Date | null> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { proctoringSuspendedUntil: true },
  });
  const until = user?.proctoringSuspendedUntil ?? null;
  if (!until) return null;
  if (!isProctoringSuspended(until)) {
    await prisma.user.update({
      where: { id: userId },
      data: { proctoringSuspendedUntil: null },
    });
    return null;
  }
  return until;
}

export async function getJobSeekerTalentPoolStatus(
  userId: string,
): Promise<JobSeekerTalentPoolStatus> {
  const prisma = getPrisma();
  const [user, suspendedUntil] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        inTalentPool: true,
        talentPoolReason: true,
        talentPoolDate: true,
      },
    }),
    resolveProctoringSuspendedUntil(userId),
  ]);

  const inTalentPool = user?.inTalentPool ?? false;
  const reason = (user?.talentPoolReason as JobSeekerTalentPoolStatus["reason"]) ?? null;

  let progress: JobSeekerTalentPoolStatus["progress"] = null;
  if (inTalentPool) {
    const metrics = await getTalentPoolMetrics(userId);
    progress = buildTalentPoolProgress(metrics);
  }

  return {
    inTalentPool,
    reason,
    poolEntryAt: user?.talentPoolDate?.toISOString() ?? null,
    proctoringSuspended: isProctoringSuspended(suspendedUntil),
    proctoringSuspendedUntil: suspendedUntil?.toISOString() ?? null,
    progress,
  };
}
