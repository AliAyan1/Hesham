import { getPrisma } from "@/lib/db";
import { createUserNotification } from "@/lib/notifications/create-user-notification";

/** Notify every employer who has an application from this job seeker. */
export async function notifyEmployersAboutJobSeeker(params: {
  jobSeekerId: string;
  jobSeekerName: string | null;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  linkPath: string;
}): Promise<void> {
  const prisma = getPrisma();
  const apps = await prisma.application.findMany({
    where: { jobSeekerId: params.jobSeekerId },
    select: { job: { select: { employerId: true } } },
  });
  const employerIds = [...new Set(apps.map((a) => a.job.employerId))];
  const name = params.jobSeekerName?.trim() || "A candidate";
  for (const employerId of employerIds) {
    await createUserNotification({
      userId: employerId,
      title: params.title,
      titleAr: params.titleAr,
      message: params.message.replace("{name}", name),
      messageAr: params.messageAr.replace("{name}", name),
      type: "EMPLOYER_CANDIDATE_INSIGHT",
      link: params.linkPath,
    });
  }
}
