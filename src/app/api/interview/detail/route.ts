import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export type InterviewDetailDto = {
  id: string;
  status: string;
  overallScore: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  clarityScore: number | null;
  relevanceScore: number | null;
  questions: unknown;
  transcripts: unknown;
  aiAnalysis: unknown;
  strengths: unknown;
  improvements: unknown;
  shareWithEmployers: boolean;
  isFlagged: boolean;
  recordingUrl: string | null;
  completedAt: string | null;
};

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<InterviewDetailDto>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.videoInterview.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      overallScore: true,
      communicationScore: true,
      confidenceScore: true,
      clarityScore: true,
      relevanceScore: true,
      questions: true,
      transcripts: true,
      aiAnalysis: true,
      strengths: true,
      improvements: true,
      shareWithEmployers: true,
      isFlagged: true,
      recordingUrl: true,
      completedAt: true,
    },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  if (row.status !== InterviewStatus.COMPLETED && row.status !== InterviewStatus.FLAGGED) {
    return NextResponse.json({ success: false, error: "Not available" }, { status: 409 });
  }

  const dto: InterviewDetailDto = {
    id: row.id,
    status: row.status,
    overallScore: row.overallScore,
    communicationScore: row.communicationScore,
    confidenceScore: row.confidenceScore,
    clarityScore: row.clarityScore,
    relevanceScore: row.relevanceScore,
    questions: row.questions,
    transcripts: row.transcripts,
    aiAnalysis: row.aiAnalysis,
    strengths: row.strengths,
    improvements: row.improvements,
    shareWithEmployers: row.shareWithEmployers,
    isFlagged: row.isFlagged,
    recordingUrl: row.recordingUrl,
    completedAt: row.completedAt?.toISOString() ?? null,
  };

  return NextResponse.json({ success: true, data: dto }, { status: 200 });
}
