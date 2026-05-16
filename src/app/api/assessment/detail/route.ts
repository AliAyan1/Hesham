import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export type AssessmentDetailDto = {
  id: string;
  type: string;
  status: string;
  totalScore: number | null;
  skillsScore: number | null;
  communicationScore: number | null;
  behavioralScore: number | null;
  industryFitScore: number | null;
  strengths: unknown;
  weaknesses: unknown;
  recommendations: unknown;
  detailedReport: unknown;
  shareWithEmployers: boolean;
  isFlagged: boolean;
  completedAt: string | null;
  stepScores: unknown;
  stepsCompleted: number;
};

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<AssessmentDetailDto>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.assessment.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      type: true,
      status: true,
      totalScore: true,
      skillsScore: true,
      communicationScore: true,
      behavioralScore: true,
      industryFitScore: true,
      strengths: true,
      weaknesses: true,
      recommendations: true,
      detailedReport: true,
      shareWithEmployers: true,
      isFlagged: true,
      completedAt: true,
      stepScores: true,
      stepsCompleted: true,
    },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const reportReady =
    row.status === AssessmentStatus.COMPLETED ||
    row.status === AssessmentStatus.FLAGGED ||
    row.stepsCompleted >= 5;
  if (!reportReady) {
    return NextResponse.json({ success: false, error: "Not available" }, { status: 409 });
  }

  const dto: AssessmentDetailDto = {
    id: row.id,
    type: row.type,
    status: row.status,
    totalScore: row.totalScore,
    skillsScore: row.skillsScore,
    communicationScore: row.communicationScore,
    behavioralScore: row.behavioralScore,
    industryFitScore: row.industryFitScore,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    recommendations: row.recommendations,
    detailedReport: row.detailedReport,
    shareWithEmployers: row.shareWithEmployers,
    isFlagged: row.isFlagged,
    completedAt: row.completedAt?.toISOString() ?? null,
    stepScores: row.stepScores,
    stepsCompleted: row.stepsCompleted,
  };

  return NextResponse.json({ success: true, data: dto }, { status: 200 });
}
