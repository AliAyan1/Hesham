import { NextResponse, type NextRequest } from "next/server";
import { ApplicationStatus, AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { EmployerDashboardPayload } from "@/types/dashboard";
import { resolveEmployerDbUserForDashboard } from "@/lib/resolve-session-user";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<EmployerDashboardPayload | { error: string }>> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleEm =
      session.user.role === UserRole.EMPLOYER ||
      String(session.user.role ?? "").toUpperCase() === UserRole.EMPLOYER;
    if (!roleEm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolved = await resolveEmployerDbUserForDashboard(session, request);
    if (!resolved) {
      return NextResponse.json(
        { error: "SESSION_STALE_SIGN_IN_AGAIN" },
        { status: 401 },
      );
    }

    const prisma = getPrisma();
    const employerId = resolved.id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      activeJobsCount,
      totalApplicationsCount,
      shortlistedCount,
      applicationsTodayCount,
      pendingReviewCount,
      recent,
      aiInterviewAgg,
    ] = await Promise.all([
      prisma.job.count({
        where: { employerId, isActive: true },
      }),
      prisma.application.count({
        where: { job: { employerId } },
      }),
      prisma.application.count({
        where: {
          job: { employerId },
          status: "SHORTLISTED",
        },
      }),
      prisma.application.count({
        where: {
          job: { employerId },
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.application.count({
        where: {
          job: { employerId },
          status: "PENDING",
        },
      }),
      prisma.application.findMany({
        where: { job: { employerId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          jobId: true,
          status: true,
          offerAcceptedAt: true,
          createdAt: true,
          job: { select: { id: true, title: true } },
          jobSeeker: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      }),
      prisma.job.findMany({
        where: { employerId },
        select: { id: true },
      }),
    ]);

    const recentApplications: EmployerDashboardPayload["recentApplications"] =
      recent.map((a) => {
        const contactUnlocked =
          a.status === ApplicationStatus.HIRED || a.offerAcceptedAt != null;
        return {
          id: a.id,
          jobId: a.jobId,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          jobTitle: a.job.title,
          candidateName: a.jobSeeker.name,
          candidateEmail: contactUnlocked ? a.jobSeeker.email : "",
          matchScore: null,
        };
      });

    const seekerRows = await prisma.application.findMany({
      where: { job: { employerId } },
      select: { jobSeekerId: true },
    });
    const seekerIds = [...new Set(seekerRows.map((r) => r.jobSeekerId))];

    let candidatesWithSharedAssessment = 0;
    let applicantsWithSharedInterview = 0;
    if (seekerIds.length > 0) {
      const ag = await prisma.assessment.groupBy({
        by: ["userId"],
        where: {
          userId: { in: seekerIds },
          status: AssessmentStatus.COMPLETED,
        },
      });
      candidatesWithSharedAssessment = ag.length;

      const ig = await prisma.videoInterview.groupBy({
        by: ["userId"],
        where: {
          userId: { in: seekerIds },
          status: InterviewStatus.COMPLETED,
        },
      });
      applicantsWithSharedInterview = ig.length;
    }

    const jobIds = aiInterviewAgg.map((j) => j.id);
    let aiInterviewsTotal = 0;
    let aiInterviewsPendingReview = 0;
    if (jobIds.length > 0) {
      const [total, pending] = await Promise.all([
        prisma.videoInterview.count({
          where: { jobId: { in: jobIds } },
        }),
        prisma.videoInterview.count({
          where: {
            jobId: { in: jobIds },
            status: { in: [InterviewStatus.PENDING, InterviewStatus.IN_PROGRESS] },
          },
        }),
      ]);
      aiInterviewsTotal = total;
      aiInterviewsPendingReview = pending;
    }

    const payload: EmployerDashboardPayload = {
      activeJobsCount,
      totalApplicationsCount,
      shortlistedCount,
      interviewsCount: applicantsWithSharedInterview,
      candidatesWithSharedAssessment,
      applicantsWithSharedInterview,
      aiInterviewsTotal,
      aiInterviewsPendingReview,
      applicationsTodayCount,
      pendingReviewCount,
      jobsExpiringSoonCount: 0,
      recentApplications,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
