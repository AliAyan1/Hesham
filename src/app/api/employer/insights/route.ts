import { ApplicationStatus, AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { sanitizeUserForEmployer } from "@/lib/sanitize-user";
import type { EmployerInsightRow, EmployerInsightsPayload } from "@/types/dashboard";

function snippetFromUnknown(value: unknown, max = 220): string | null {
  if (typeof value === "string" && value.trim()) {
    const t = value.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
  if (value && typeof value === "object") {
    const r = value as Record<string, unknown>;
    const fb =
      (typeof r.overallFeedback === "string" && r.overallFeedback) ||
      (typeof r.overallFeedbackAr === "string" && r.overallFeedbackAr) ||
      (typeof r.summary === "string" && r.summary);
    if (fb) return snippetFromUnknown(fb, max);
  }
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId")?.trim() || undefined;
  const prisma = getPrisma();
  const employerId = session.user.id;

  const [totalApplicants, applications] = await Promise.all([
    prisma.application.count({
      where: {
        job: { employerId },
        ...(jobId ? { jobId } : {}),
      },
    }),
    prisma.application.findMany({
    where: {
      job: { employerId },
      ...(jobId ? { jobId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      offerAcceptedAt: true,
      createdAt: true,
      matchScore: true,
      job: { select: { id: true, title: true } },
      jobSeeker: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          assessments: {
            where: {
              status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
              shareWithEmployers: true,
            },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: {
              totalScore: true,
              overallScore: true,
              writtenReport: true,
              isFlagged: true,
            },
          },
          videoInterviews: {
            where: {
              status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
              shareWithEmployers: true,
            },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: {
              overallScore: true,
              aiAnalysis: true,
            },
          },
        },
      },
    },
    }),
  ]);

  const jobInterviewByKey = new Map<
    string,
    {
      status: InterviewStatus;
      overallScore: number | null;
      isFlagged: boolean;
      aiAnalysis: unknown;
    }
  >();

  if (applications.length > 0) {
    const pairs = applications.map((a) => ({
      userId: a.jobSeeker.id,
      jobId: a.job.id,
    }));
    const interviews = await prisma.videoInterview.findMany({
      where: {
        OR: pairs.map((p) => ({ userId: p.userId, jobId: p.jobId })),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        userId: true,
        jobId: true,
        status: true,
        overallScore: true,
        isFlagged: true,
        aiAnalysis: true,
      },
    });
    for (const iv of interviews) {
      if (!iv.jobId) continue;
      const key = `${iv.userId}:${iv.jobId}`;
      if (!jobInterviewByKey.has(key)) {
        jobInterviewByKey.set(key, {
          status: iv.status,
          overallScore: iv.overallScore,
          isFlagged: iv.isFlagged,
          aiAnalysis: iv.aiAnalysis,
        });
      }
    }
  }

  const items: EmployerInsightRow[] = applications.map((row) => {
    const isHired =
      row.status === ApplicationStatus.HIRED || row.offerAcceptedAt != null;
    const candidate = sanitizeUserForEmployer(row.jobSeeker, isHired);
    const assessment = row.jobSeeker.assessments[0] ?? null;
    const generalInterview = row.jobSeeker.videoInterviews[0] ?? null;
    const jobIv = jobInterviewByKey.get(`${row.jobSeeker.id}:${row.job.id}`) ?? null;

    const jobInterviewCompleted =
      jobIv?.status === InterviewStatus.COMPLETED ||
      jobIv?.status === InterviewStatus.FLAGGED;

    const aiSummary =
      snippetFromUnknown(jobIv?.aiAnalysis) ??
      snippetFromUnknown(generalInterview?.aiAnalysis) ??
      snippetFromUnknown(assessment?.writtenReport);

    return {
      applicationId: row.id,
      applicationStatus: row.status,
      appliedAt: row.createdAt.toISOString(),
      jobId: row.job.id,
      jobTitle: row.job.title,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email ?? "",
      contactHidden: !isHired,
      matchScore: row.matchScore,
      assessmentScore:
        assessment?.totalScore ??
        (assessment?.overallScore != null ? Math.round(assessment.overallScore) : null),
      assessmentCompleted: Boolean(assessment),
      assessmentFlagged: assessment?.isFlagged ?? false,
      generalInterviewScore: generalInterview?.overallScore ?? null,
      jobInterviewStatus: jobIv?.status ?? null,
      jobInterviewScore: jobIv?.overallScore ?? null,
      jobInterviewCompleted,
      jobInterviewFlagged: jobIv?.isFlagged ?? false,
      aiSummary,
    };
  });

  const jobCounts = await prisma.application.groupBy({
    by: ["jobId"],
    where: { job: { employerId } },
    _count: { _all: true },
  });
  const jobRows = await prisma.job.findMany({
    where: { employerId, isActive: true },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
  const countByJob = new Map(jobCounts.map((g) => [g.jobId, g._count._all]));

  const completedScores = items
    .filter((i) => i.jobInterviewCompleted && i.jobInterviewScore != null)
    .map((i) => i.jobInterviewScore as number);
  const avgJobInterviewScore =
    completedScores.length > 0
      ? Math.round(
          completedScores.reduce((s, n) => s + n, 0) / completedScores.length,
        )
      : null;

  const payload: EmployerInsightsPayload = {
    stats: {
      totalApplicants,
      withJobInterview: items.filter((i) => i.jobInterviewStatus != null).length,
      jobInterviewsCompleted: items.filter((i) => i.jobInterviewCompleted).length,
      withAssessment: items.filter((i) => i.assessmentCompleted).length,
      avgJobInterviewScore,
    },
    jobs: jobRows.map((j) => ({
      id: j.id,
      title: j.title,
      applicantCount: countByJob.get(j.id) ?? 0,
    })),
    items,
  };

  return NextResponse.json({ success: true, data: payload });
}
