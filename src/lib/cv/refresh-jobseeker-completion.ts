import { getPrisma } from "@/lib/db";
import { computeCvCompletionPercent } from "@/lib/cv/completion";

/** Recomputes CV `completionPct` / `isComplete` after profile photo or CV fields change. */
export async function refreshJobSeekerCvCompletionPct(userId: string): Promise<void> {
  const prisma = getPrisma();
  const cvAfter = await prisma.cV.findUnique({ where: { userId } });
  if (!cvAfter) return;
  const imgUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  const completionPct = computeCvCompletionPercent({
    cv: cvAfter,
    hasProfilePhoto: Boolean(imgUser?.image),
  });
  await prisma.cV.update({
    where: { userId },
    data: { completionPct, isComplete: completionPct >= 100 },
  });
}
