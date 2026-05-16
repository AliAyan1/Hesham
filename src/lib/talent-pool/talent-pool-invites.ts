import {
  InterviewStatus,
  NotificationType,
  TalentPoolInviteStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { ASSESSMENT_PASS_SCORE } from "@/lib/assessment/steps";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { TALENT_POOL_INVITE_DAYS } from "@/lib/talent-pool/talent-pool-criteria";
import { getTalentPoolMetrics } from "@/lib/talent-pool/get-talent-pool-metrics";
import { removeFromTalentPoolAsActive } from "@/lib/talent-pool/remove-from-talent-pool";
import { getInterviewTemplateForJob } from "@/lib/employer-interview/job-template-db";
import { employerInterviewQuestionsToVideoJson } from "@/lib/employer-interview/to-video-interview-questions";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";

export type InviteGate = "needs_assessment" | "needs_score" | "expired" | "ok";

export function inviteExpiresAt(): Date {
  return new Date(Date.now() + TALENT_POOL_INVITE_DAYS * 24 * 60 * 60 * 1000);
}

export async function resolveInviteAssessmentGate(
  candidateId: string,
): Promise<{ gate: InviteGate; metrics: Awaited<ReturnType<typeof getTalentPoolMetrics>> }> {
  const metrics = await getTalentPoolMetrics(candidateId);
  if (!metrics.assessmentComplete) {
    return { gate: "needs_assessment", metrics };
  }
  if ((metrics.assessmentScore ?? 0) < ASSESSMENT_PASS_SCORE) {
    return { gate: "needs_score", metrics };
  }
  return { gate: "ok", metrics };
}

function initialInviteStatus(gate: InviteGate): TalentPoolInviteStatus {
  return gate === "ok" ? TalentPoolInviteStatus.ASSESSMENT_COMPLETE : TalentPoolInviteStatus.PENDING_ASSESSMENT;
}

export async function createTalentPoolInvite(params: {
  employerId: string;
  candidateId: string;
  jobId: string;
}): Promise<{ inviteId: string; status: TalentPoolInviteStatus }> {
  const prisma = getPrisma();

  const candidate = await prisma.user.findUnique({
    where: { id: params.candidateId },
    select: { inTalentPool: true, name: true, email: true },
  });
  if (!candidate?.inTalentPool) {
    throw new Error("candidate_not_in_pool");
  }

  const job = await prisma.job.findFirst({
    where: { id: params.jobId, employerId: params.employerId, isActive: true },
    select: {
      id: true,
      title: true,
      employer: {
        select: {
          employerProfile: { select: { companyName: true } },
          name: true,
        },
      },
    },
  });
  if (!job) throw new Error("job_not_found");

  const { gate } = await resolveInviteAssessmentGate(params.candidateId);
  const status = initialInviteStatus(gate);
  const expiresAt = inviteExpiresAt();

  const invite = await prisma.talentPoolInvite.upsert({
    where: {
      candidateId_jobId: { candidateId: params.candidateId, jobId: params.jobId },
    },
    create: {
      candidateId: params.candidateId,
      employerId: params.employerId,
      jobId: params.jobId,
      status,
      expiresAt,
    },
    update: {
      employerId: params.employerId,
      status,
      expiresAt,
      updatedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  const company =
    job.employer.employerProfile?.companyName?.trim() ||
    job.employer.name?.trim() ||
    "An employer";

  await createUserNotification({
    userId: params.candidateId,
    type: NotificationType.TALENT_POOL_INVITE,
    title: `${company} invited you to apply`,
    titleAr: `${company} دعاك للتقديم`,
    message: `${company} wants to interview you for ${job.title}! Complete your assessment to unlock this opportunity.`,
    messageAr: `${company} يريد مقابلتك لوظيفة ${job.title}! أكمل تقييمك لفتح هذه الفرصة.`,
    link: "/dashboard/job-seeker/invites",
  });

  return { inviteId: invite.id, status: invite.status };
}

export async function expireStaleInvites(): Promise<void> {
  const prisma = getPrisma();
  await prisma.talentPoolInvite.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: {
        in: [
          TalentPoolInviteStatus.PENDING_ASSESSMENT,
          TalentPoolInviteStatus.ASSESSMENT_COMPLETE,
        ],
      },
    },
    data: { status: TalentPoolInviteStatus.EXPIRED },
  });
}

export async function refreshInvitesAfterAssessment(candidateId: string): Promise<void> {
  const prisma = getPrisma();
  await expireStaleInvites();

  const { gate, metrics } = await resolveInviteAssessmentGate(candidateId);
  const invites = await prisma.talentPoolInvite.findMany({
    where: {
      candidateId,
      status: {
        in: [
          TalentPoolInviteStatus.PENDING_ASSESSMENT,
          TalentPoolInviteStatus.ASSESSMENT_COMPLETE,
        ],
      },
      expiresAt: { gt: new Date() },
    },
    include: {
      job: { select: { title: true } },
      employer: {
        select: {
          name: true,
          employerProfile: { select: { companyName: true } },
        },
      },
    },
  });

  if (gate === "ok") {
    for (const inv of invites) {
      if (inv.status !== TalentPoolInviteStatus.ASSESSMENT_COMPLETE) {
        await prisma.talentPoolInvite.update({
          where: { id: inv.id },
          data: { status: TalentPoolInviteStatus.ASSESSMENT_COMPLETE },
        });
        const company =
          inv.employer.employerProfile?.companyName?.trim() ||
          inv.employer.name?.trim() ||
          "Employer";
        await createUserNotification({
          userId: candidateId,
          type: NotificationType.TALENT_POOL_INVITE_UPDATE,
          title: "Assessment complete — invite unlocked",
          titleAr: "اكتمل التقييم — الدعوة متاحة",
          message: `Your assessment is complete! You can now accept the invitation for ${inv.job.title}.`,
          messageAr: `اكتمل تقييمك! يمكنك الآن قبول دعوة ${inv.job.title}.`,
          link: "/dashboard/job-seeker/invites",
        });
        await createUserNotification({
          userId: inv.employerId,
          type: NotificationType.TALENT_POOL_INVITE_UPDATE,
          title: "Candidate assessment complete",
          titleAr: "اكتمل تقييم المرشح",
          message: `A candidate has completed their assessment and can now proceed with your interview invitation for ${inv.job.title}.`,
          messageAr: `أكمل مرشح تقييمه ويمكنه الآن متابعة دعوتك للمقابلة لوظيفة ${inv.job.title}.`,
          link: `/dashboard/employer/talent-pool/${encodeURIComponent(candidateId)}`,
        });
      }
    }
  }
  void metrics;
}

export async function acceptTalentPoolInvite(params: {
  inviteId: string;
  candidateId: string;
}): Promise<{ gate: InviteGate; applicationId?: string }> {
  const prisma = getPrisma();
  await expireStaleInvites();

  const invite = await prisma.talentPoolInvite.findFirst({
    where: { id: params.inviteId, candidateId: params.candidateId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          employerId: true,
          employer: {
            select: {
              name: true,
              employerProfile: { select: { companyName: true } },
            },
          },
        },
      },
    },
  });

  if (!invite) throw new Error("invite_not_found");
  if (invite.status === TalentPoolInviteStatus.EXPIRED || invite.expiresAt < new Date()) {
    await prisma.talentPoolInvite.update({
      where: { id: invite.id },
      data: { status: TalentPoolInviteStatus.EXPIRED },
    });
    return { gate: "expired" };
  }
  if (invite.status === TalentPoolInviteStatus.ACCEPTED) {
    return { gate: "ok" };
  }
  if (invite.status === TalentPoolInviteStatus.DECLINED) {
    throw new Error("invite_declined");
  }

  const { gate } = await resolveInviteAssessmentGate(params.candidateId);
  if (gate !== "ok") return { gate };

  const existing = await prisma.application.findUnique({
    where: { jobId_jobSeekerId: { jobId: invite.jobId, jobSeekerId: params.candidateId } },
    select: { id: true },
  });

  const applicationId =
    existing?.id ??
    (
      await prisma.application.create({
        data: {
          jobId: invite.jobId,
          jobSeekerId: params.candidateId,
          status: "SHORTLISTED",
        },
        select: { id: true },
      })
    ).id;

  await prisma.talentPoolInvite.update({
    where: { id: invite.id },
    data: { status: TalentPoolInviteStatus.ACCEPTED },
  });

  const company =
    invite.job.employer.employerProfile?.companyName?.trim() ||
    invite.job.employer.name?.trim() ||
    "Employer";

  const seeker = await prisma.user.findUnique({
    where: { id: params.candidateId },
    select: { name: true, email: true },
  });
  const candidateName =
    seeker?.name?.trim() || seeker?.email?.split("@")[0] || "Candidate";

  await createUserNotification({
    userId: invite.employerId,
    type: NotificationType.TALENT_POOL_INVITE_UPDATE,
    title: "Invitation accepted",
    titleAr: "تم قبول الدعوة",
    message: `${candidateName} has accepted your invitation for ${invite.job.title}.`,
    messageAr: `${candidateName} قبل دعوتك لوظيفة ${invite.job.title}.`,
    link: `/dashboard/employer/candidates?job=${invite.jobId}`,
  });

  await removeFromTalentPoolAsActive({
    userId: params.candidateId,
    notifyCandidate: true,
    notifyEmployerIds: [invite.employerId],
    jobTitleForEmployer: invite.job.title,
  });

  const jobTemplate = await getInterviewTemplateForJob(invite.jobId);
  if (jobTemplate.questions.length > 0 && seeker?.email) {
    const existingIv = await prisma.videoInterview.findFirst({
      where: {
        userId: params.candidateId,
        jobId: invite.jobId,
        status: { in: [InterviewStatus.PENDING, InterviewStatus.IN_PROGRESS] },
      },
      select: { id: true },
    });
    if (!existingIv) {
      const videoQs = employerInterviewQuestionsToVideoJson(jobTemplate.questions);
      await prisma.videoInterview.create({
        data: {
          userId: params.candidateId,
          jobId: invite.jobId,
          interviewKind: "job",
          status: InterviewStatus.PENDING,
          questions: videoQs as object[],
        },
      });
      const base = process.env.NEXTAUTH_URL ?? "https://qudrahtech.com";
      await createUserNotification({
        userId: params.candidateId,
        type: NotificationType.INTERVIEW_READY,
        title: "Complete your AI interview",
        titleAr: "أكمل مقابلة الذكاء الاصطناعي",
        message: `You accepted an invitation for ${invite.job.title}. Complete your video interview.`,
        messageAr: `قبلت دعوة لوظيفة ${invite.job.title}. أكمل مقابلة الفيديو.`,
        link: "/dashboard/job-seeker/interview",
      });
      await sendTransactionalEmail({
        to: seeker.email,
        subject: `Interview — ${invite.job.title}`,
        html: `<p>Hi ${candidateName},</p><p>You accepted an invitation for <strong>${invite.job.title}</strong>. <a href="${base}/dashboard/job-seeker/interview">Start interview</a></p>`,
      });
    }
  }

  return { gate: "ok", applicationId };
}

export async function declineTalentPoolInvite(params: {
  inviteId: string;
  candidateId: string;
}): Promise<void> {
  const prisma = getPrisma();
  await prisma.talentPoolInvite.updateMany({
    where: { id: params.inviteId, candidateId: params.candidateId },
    data: { status: TalentPoolInviteStatus.DECLINED },
  });
}
