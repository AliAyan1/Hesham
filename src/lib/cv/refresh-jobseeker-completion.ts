import { getPrisma } from "@/lib/db";
import { computeProfilePageCompletionFromRecords } from "@/lib/profile-page-completion";

/** Recomputes CV `completionPct` / `isComplete` from full My Profile sections. */
export async function refreshJobSeekerCvCompletionPct(userId: string): Promise<void> {
  const prisma = getPrisma();
  const [user, profile, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.cV.findUnique({ where: { userId } }),
  ]);

  const completionPct = computeProfilePageCompletionFromRecords({
    hasProfilePhoto: Boolean(user?.image),
    name: user?.name ?? null,
    profile,
    cv,
  });

  await prisma.cV.upsert({
    where: { userId },
    create: {
      userId,
      completionPct,
      isComplete: completionPct >= 100,
    },
    update: {
      completionPct,
      isComplete: completionPct >= 100,
    },
  });
}
