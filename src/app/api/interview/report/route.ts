import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import {
  enhancedInterviewReportSchema,
  type CandidateInterviewReportView,
  type EnhancedInterviewReport,
} from "@/lib/interview/enhanced-report-types";
import { ensureEnhancedInterviewReport } from "@/lib/interview/generate-enhanced-report";
import type { ApiResponse } from "@/types";

export const maxDuration = 60;

function toCandidateView(
  report: EnhancedInterviewReport,
  overallScore: number | null,
  improvements: unknown,
): CandidateInterviewReportView {
  const conf = report.facialExpressionAnalysis.overallConfidenceScore;
  const bodyLanguageLabel: CandidateInterviewReportView["bodyLanguageLabel"] =
    conf >= 7 ? "Good" : conf >= 5 ? "Fair" : "Needs Work";

  const impList = Array.isArray(improvements)
    ? (improvements as Array<{ title?: string; tip?: string; titleAr?: string; tipAr?: string }>)
        .filter((i) => i && typeof i.title === "string")
        .slice(0, 5)
        .map((i) => ({
          title: i.title ?? "",
          tip: i.tip ?? "",
          titleAr: i.titleAr ?? "",
          tipAr: i.tipAr ?? "",
        }))
    : [];

  return {
    overallScore: overallScore ?? Math.round(report.executiveSummary.overallRating * 10),
    communicationScore: Math.round(report.communicationAnalysis.score * 10),
    contentScore: Math.round(report.contentAnalysis.score * 10),
    behavioralScore: Math.round(report.behavioralAnalysis.score * 10),
    bodyLanguageLabel,
    communicationFeedbackEN: report.communicationAnalysis.detailEN,
    communicationFeedbackAR: report.communicationAnalysis.detailAR,
    contentFeedbackEN: report.contentAnalysis.detailEN,
    contentFeedbackAR: report.contentAnalysis.detailAR,
    improvements: impList,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{
      mode: "employer" | "candidate";
      interviewId: string;
      candidateName: string;
      jobTitle: string;
      completedAt: string | null;
      report: EnhancedInterviewReport | null;
      candidateView: CandidateInterviewReportView | null;
      overallScore: number | null;
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const interviewId = request.nextUrl.searchParams.get("interviewId")?.trim();
  const applicationId = request.nextUrl.searchParams.get("applicationId")?.trim();
  if (!interviewId && !applicationId) {
    return NextResponse.json({ success: false, error: "interviewId or applicationId required" }, { status: 400 });
  }

  const prisma = getPrisma();

  let interviewIdResolved: string | undefined = interviewId ?? undefined;
  if (!interviewIdResolved && applicationId) {
    const app = await prisma.application.findFirst({
      where: {
        id: applicationId,
        job: session.user.role === UserRole.EMPLOYER ? { employerId: session.user.id } : undefined,
      },
      select: { jobId: true, jobSeekerId: true, job: { select: { title: true } } },
    });
    if (!app) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    const iv = await prisma.videoInterview.findFirst({
      where: {
        userId: app.jobSeekerId,
        jobId: app.jobId,
        status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
      },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });
    interviewIdResolved = iv?.id;
  }

  if (!interviewIdResolved) {
    return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
  }

  const row = await prisma.videoInterview.findUnique({
    where: { id: interviewIdResolved },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!row || (row.status !== InterviewStatus.COMPLETED && row.status !== InterviewStatus.FLAGGED)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const isOwner = row.userId === session.user.id;
  const isEmployer = session.user.role === UserRole.EMPLOYER;

  if (isEmployer) {
    if (applicationId) {
      const appCheck = await prisma.application.findFirst({
        where: { id: applicationId, job: { employerId: session.user.id } },
        select: { id: true },
      });
      if (!appCheck) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else if (row.jobId != null) {
      const ownsJob = await prisma.job.findFirst({
        where: { id: row.jobId, employerId: session.user.id },
        select: { id: true },
      });
      if (!ownsJob) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  } else if (!isOwner) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let jobTitle = "Role";
  if (row.jobId) {
    const job = await prisma.job.findUnique({ where: { id: row.jobId }, select: { title: true } });
    if (job?.title) jobTitle = job.title;
  }

  const parsed = row.enhancedReport
    ? enhancedInterviewReportSchema.safeParse(row.enhancedReport)
    : null;
  let report = parsed?.success ? parsed.data : null;

  if (!report && isEmployer) {
    report = await ensureEnhancedInterviewReport(row.id);
  }

  const mode = isEmployer ? "employer" : "candidate";

  return NextResponse.json({
    success: true,
    data: {
      mode,
      interviewId: row.id,
      candidateName: row.user.name ?? row.user.email.split("@")[0] ?? "Candidate",
      jobTitle,
      completedAt: row.completedAt?.toISOString() ?? null,
      report: mode === "employer" ? report : null,
      candidateView:
        report && mode === "candidate" ? toCandidateView(report, row.overallScore, row.improvements) : null,
      overallScore: row.overallScore,
    },
  });
}
