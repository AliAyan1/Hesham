import { NotificationType } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { setUserTalentPoolActive } from "@/lib/talent-pool/sync-user-talent-pool";

export async function removeFromTalentPoolAsActive(params: {
  userId: string;
  notifyCandidate?: boolean;
  notifyEmployerIds?: string[];
  jobTitleForEmployer?: string;
}): Promise<boolean> {
  const prisma = getPrisma();
  const wasInPool = await prisma.talentPoolEntry.findFirst({
    where: { userId: params.userId },
    select: { id: true },
  });
  if (!wasInPool) return false;

  await setUserTalentPoolActive(params.userId);

  if (params.notifyCandidate !== false) {
    await createUserNotification({
      userId: params.userId,
      type: NotificationType.TALENT_POOL_ACTIVE,
      title: "You are now an Active Candidate!",
      titleAr: "أصبحت مرشحًا نشطًا!",
      message:
        "Congratulations! Your profile is now active and visible to employers. Start applying to jobs!",
      messageAr:
        "تهانينا! ملفك نشط الآن ومرئي لأصحاب العمل. ابدأ التقديم على الوظائف!",
      link: "/dashboard/job-seeker/jobs",
    });
  }

  const employerIds = params.notifyEmployerIds ?? [];
  const jobTitle = params.jobTitleForEmployer ?? "open roles";
  const seeker = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, email: true },
  });
  const name = seeker?.name?.trim() || seeker?.email?.split("@")[0] || "Candidate";

  for (const employerId of employerIds) {
    await createUserNotification({
      userId: employerId,
      type: NotificationType.TALENT_POOL_ACTIVE,
      title: "Talent pool candidate is now active",
      titleAr: "مرشح من مجموعة المواهب أصبح نشطًا",
      message: `${name} has improved their profile and is now available for ${jobTitle}.`,
      messageAr: `${name} حسّن ملفه وهو متاح الآن لـ ${jobTitle}.`,
      link: "/dashboard/employer/talent-pool",
    });
  }

  return true;
}
