import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { JobSeekerDashboardPayload } from "@/types/dashboard";
import { computeProfilePageCompletionFromRecords } from "@/lib/profile-page-completion";
import { resolveJobSeekerDbUserForUpload } from "@/lib/resolve-session-user";
import { getJobSeekerTalentPoolStatus } from "@/lib/talent-pool/talent-pool-server";
import { evaluateTalentPoolEntry } from "@/lib/talent-pool/evaluate-talent-pool-entry";
import { evaluateTalentPoolExit } from "@/lib/talent-pool/evaluate-talent-pool-exit";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<JobSeekerDashboardPayload | { error: string }>> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleJs =
      session.user.role === UserRole.JOBSEEKER ||
      String(session.user.role ?? "").toUpperCase() === UserRole.JOBSEEKER;
    if (!roleJs) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolved = await resolveJobSeekerDbUserForUpload(session, request);
    if (!resolved) {
      return NextResponse.json(
        { error: "SESSION_STALE_SIGN_IN_AGAIN" },
        { status: 401 },
      );
    }

    const prisma = getPrisma();
    const userId = resolved.id;

    const [
      profile,
      cv,
      user,
      applicationsCount,
      jobsAvailableCount,
      recentApps,
      bestAssessment,
      latestInterview,
    ] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.cV.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, subscriptionTier: true },
      }),
      prisma.application.count({ where: { jobSeekerId: userId } }),
      prisma.job.count({ where: { isActive: true } }),
      prisma.application.findMany({
        where: { jobSeekerId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          jobId: true,
          status: true,
          matchScore: true,
          createdAt: true,
          job: {
            select: {
              id: true,
              title: true,
              employer: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.assessment.findFirst({
        where: {
          userId,
          status: AssessmentStatus.COMPLETED,
          isFlagged: false,
        },
        orderBy: { totalScore: "desc" },
        select: { totalScore: true },
      }),
      prisma.videoInterview.findFirst({
        where: { userId, status: InterviewStatus.COMPLETED },
        orderBy: { completedAt: "desc" },
        select: { overallScore: true },
      }),
    ]);

    const fallbackAssessment = bestAssessment
      ? null
      : await prisma.assessment.findFirst({
          where: { userId, status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] } },
          orderBy: { completedAt: "desc" },
          select: { totalScore: true },
        });

    const assessmentScore = bestAssessment?.totalScore ?? fallbackAssessment?.totalScore ?? null;
    const showTopPercentileBand = assessmentScore != null && assessmentScore >= 85;
    const interviewScore = latestInterview?.overallScore ?? null;

    const jobMatchesCount = jobsAvailableCount;

    const recentApplications: JobSeekerDashboardPayload["recentApplications"] =
      recentApps.map((a) => ({
        id: a.id,
        jobId: a.jobId,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        jobTitle: a.job.title,
        company:
          a.job.employer?.name ??
          (a.job.employer?.email ? a.job.employer.email : null),
        matchScore: a.matchScore ?? null,
      }));

    const atsScore = cv?.atsScore ?? profile?.atsScore ?? null;

    await evaluateTalentPoolEntry(userId);
    await evaluateTalentPoolExit(userId);
    const talentPool = await getJobSeekerTalentPoolStatus(userId);

    const payload: JobSeekerDashboardPayload = {
      profileCompletion:
        cv?.completionPct ??
        computeProfilePageCompletionFromRecords({
          hasProfilePhoto: Boolean(user?.image),
          name: user?.name ?? null,
          profile,
          cv,
        }),
      applicationsCount,
      jobsAvailableCount,
      jobMatchesCount,
      assessmentScore,
      interviewScore,
      showTopPercentileBand,
      atsScore,
      subscriptionTier: user?.subscriptionTier ?? "FREE",
      recentApplications,
      talentPool,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
