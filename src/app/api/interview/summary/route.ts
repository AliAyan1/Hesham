import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export type InterviewSummaryRow = {
  id: string;
  status: string;
  overallScore: number | null;
  completedAt: string | null;
  shareWithEmployers: boolean;
  isFlagged: boolean;
  jobId: string | null;
  interviewKind: string | null;
  jobTitle: string | null;
};

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<ApiResponse<{ interviews: InterviewSummaryRow[] }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const rows = await prisma.videoInterview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      status: true,
      overallScore: true,
      completedAt: true,
      shareWithEmployers: true,
      isFlagged: true,
      jobId: true,
      interviewKind: true,
    },
  });

  const jobIds = [...new Set(rows.map((r) => r.jobId).filter((id): id is string => Boolean(id)))];
  const jobs =
    jobIds.length > 0
      ? await prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, title: true },
        })
      : [];
  const titleByJobId = new Map(jobs.map((j) => [j.id, j.title]));

  const interviews: InterviewSummaryRow[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    overallScore: r.overallScore,
    completedAt: r.completedAt?.toISOString() ?? null,
    shareWithEmployers: r.shareWithEmployers,
    isFlagged: r.isFlagged,
    jobId: r.jobId,
    interviewKind: r.interviewKind,
    jobTitle: r.jobId ? (titleByJobId.get(r.jobId) ?? null) : null,
  }));

  return NextResponse.json({ success: true, data: { interviews } }, { status: 200 });
}
