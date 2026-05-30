import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { parseTraitScores } from "@/lib/assessment/assessment-data";
import type { TraitScoresMap, WrittenReport } from "@/lib/assessment/profilext-types";
import type { ApiResponse } from "@/types";

export type AssessmentDetailDto = {
  id: string;
  type: string;
  status: string;
  candidateName: string;
  totalScore: number | null;
  overallScore: number | null;
  thinkingStyleScore: number | null;
  behavioralScore: number | null;
  interestsScore: number | null;
  skillsScore: number | null;
  communicationScore: number | null;
  industryFitScore: number | null;
  traitScores: TraitScoresMap;
  writtenReport: WrittenReport | null;
  jobFitScores: Record<string, number> | null;
  topJobMatches: unknown;
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
    include: { user: { select: { name: true } } },
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
    candidateName: row.user.name ?? "Candidate",
    totalScore: row.totalScore,
    overallScore: row.overallScore ?? row.totalScore,
    thinkingStyleScore: row.thinkingStyleScore,
    behavioralScore: row.behavioralScore,
    interestsScore: row.interestsScore,
    skillsScore: row.skillsScore,
    communicationScore: row.communicationScore,
    industryFitScore: row.industryFitScore,
    traitScores: parseTraitScores(row.traitScores) as TraitScoresMap,
    writtenReport: (row.writtenReport as WrittenReport | null) ?? null,
    jobFitScores: (row.jobFitScores as Record<string, number> | null) ?? null,
    topJobMatches: row.topJobMatches,
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
