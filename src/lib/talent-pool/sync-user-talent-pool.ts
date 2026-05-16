import type { TalentPoolReason } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export async function syncUserTalentPoolFlags(userId: string): Promise<void> {
  const prisma = getPrisma();
  const entry = await prisma.talentPoolEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { reason: true, createdAt: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inTalentPool: true },
  });

  if (!entry) {
    if (user?.inTalentPool) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          inTalentPool: false,
          talentPoolReason: null,
          talentPoolDate: null,
        },
      });
    }
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      inTalentPool: true,
      talentPoolReason: entry.reason,
      talentPoolDate: entry.createdAt,
    },
  });
}

export async function setUserTalentPoolActive(userId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.talentPoolEntry.deleteMany({ where: { userId } });
  await prisma.user.update({
    where: { id: userId },
    data: {
      inTalentPool: false,
      talentPoolReason: null,
      talentPoolDate: null,
    },
  });
}

export async function markUserInTalentPool(
  userId: string,
  reason: TalentPoolReason,
  entryCreatedAt: Date,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: {
      inTalentPool: true,
      talentPoolReason: reason,
      talentPoolDate: entryCreatedAt,
    },
  });
}
