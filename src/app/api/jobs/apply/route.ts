import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, InterviewStatus, NotificationType, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { onApplicationSubmitted, onInterviewInvitation } from "@/lib/email-triggers";
import { getInterviewTemplateForJob } from "@/lib/employer-interview/job-template-db";
import { employerInterviewQuestionsToVideoJson } from "@/lib/employer-interview/to-video-interview-questions";
import { shareCompletedAssessmentsForUser } from "@/lib/assessment/auto-share";

const bodySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().max(8000).optional(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ applicationId: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const seekerId = session.user.id;

  const seekerPool = await prisma.user.findUnique({
    where: { id: seekerId },
    select: { inTalentPool: true },
  });
  if (seekerPool?.inTalentPool) {
    return NextResponse.json(
      { success: false, error: "talent_pool_blocked" },
      { status: 403 },
    );
  }

  const completedAssessment = await prisma.assessment.findFirst({
    where: {
      userId: seekerId,
      status: AssessmentStatus.COMPLETED,
      isFlagged: false,
      totalScore: { gte: 50 },
    },
    select: { id: true, totalScore: true },
  });
  if (!completedAssessment) {
    return NextResponse.json(
      { success: false, error: "assessment_required" },
      { status: 403 },
    );
  }

  const job = await prisma.job.findFirst({
    where: { id: parsed.data.jobId, isActive: true },
    include: {
      employer: {
        select: {
          id: true,
          name: true,
          email: true,
          employerProfile: { select: { companyName: true } },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  const cv = await prisma.cV.findUnique({ where: { userId: seekerId }, select: { id: true } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          jobId: job.id,
          jobSeekerId: seekerId,
          coverLetter: parsed.data.coverLetter,
          ...(cv ? { cvSnapshot: { cvId: cv.id } } : {}),
        },
        select: { id: true },
      });

      await tx.job.update({
        where: { id: job.id },
        data: { applicationCount: { increment: 1 } },
        select: { id: true },
      });

      return created;
    });

    await shareCompletedAssessmentsForUser(prisma, seekerId);

    const seeker = await prisma.user.findUnique({
      where: { id: seekerId },
      select: { name: true, email: true },
    });
    const displayName =
      seeker?.name?.trim() || seeker?.email?.split("@")[0] || "Candidate";

    const company =
      job.employer.employerProfile?.companyName?.trim() || job.employer.name || "Employer";

    if (seeker?.email && job.employer.email) {
      await onApplicationSubmitted({
        applicationId: result.id,
        jobId: job.id,
        jobTitle: job.title,
        company,
        seekerId,
        seekerEmail: seeker.email,
        seekerName: displayName,
        employerId: job.employerId,
        employerEmail: job.employer.email,
        assessmentScore: completedAssessment?.totalScore ?? null,
      });
    }

    const jobTemplate = await getInterviewTemplateForJob(job.id);
    if (jobTemplate.questions.length > 0 && seeker?.email) {
      const existingIv = await prisma.videoInterview.findFirst({
        where: {
          userId: seekerId,
          jobId: job.id,
          status: { in: [InterviewStatus.PENDING, InterviewStatus.IN_PROGRESS] },
        },
        select: { id: true },
      });
      if (!existingIv) {
        const videoQs = employerInterviewQuestionsToVideoJson(jobTemplate.questions);
        await prisma.videoInterview.create({
          data: {
            userId: seekerId,
            jobId: job.id,
            interviewKind: "job",
            status: InterviewStatus.PENDING,
            questions: videoQs as object[],
          },
          select: { id: true },
        });
        await createUserNotification({
          userId: seekerId,
          type: NotificationType.INTERVIEW_READY,
          title: "Complete your AI interview",
          titleAr: "أكمل مقابلة الذكاء الاصطناعي",
          message: `You have a video interview for ${job.title}. Open your dashboard to begin.`,
          messageAr: `لديك مقابلة فيديو لوظيفة ${job.title}. افتح لوحة التحكم للبدء.`,
          link: "/dashboard/job-seeker/interview",
        });
        await onInterviewInvitation({
          seekerId,
          seekerEmail: seeker.email,
          jobTitle: job.title,
          company,
          jobId: job.id,
        });
      }
    }

    return NextResponse.json({ success: true, data: { applicationId: result.id } });
  } catch (e: unknown) {
    const msg = typeof e === "object" && e !== null && "code" in e ? String(e.code) : "";
    if (msg === "P2002") {
      return NextResponse.json(
        { success: false, error: "already_applied" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: "apply_failed" }, { status: 500 });
  }
}
