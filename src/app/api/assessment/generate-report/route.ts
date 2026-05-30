import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { parseTraitScores } from "@/lib/assessment/assessment-data";
import { generateWrittenReport } from "@/lib/assessment/generate-written-report";
import { calculateAllJobFits, topRecommendedRoles } from "@/lib/job-fit-calculator";
import type { InterestScoresMap, TraitScoresMap } from "@/lib/assessment/profilext-types";
import type { ApiResponse } from "@/types";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ reportGenerated: boolean }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { assessmentId?: string };
  const prisma = getPrisma();

  const row = await prisma.assessment.findFirst({
    where: {
      id: body.assessmentId,
      userId: session.user.id,
      status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
    },
  });

  if (!row || !row.traitScores) {
    return NextResponse.json({ success: false, error: "Assessment not found" }, { status: 404 });
  }

  const traitScores = parseTraitScores(row.traitScores) as TraitScoresMap;
  const interestScores = (row.interestScores ?? {}) as InterestScoresMap;
  const jobFitScores = calculateAllJobFits(traitScores, interestScores);
  const matches = topRecommendedRoles(jobFitScores, traitScores);

  const result = await generateWrittenReport({
    candidateName: session.user.name ?? "Candidate",
    traitScores,
    interestScores,
    jobFitScores,
    topJobMatches: matches,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Report generation failed" }, { status: 503 });
  }

  await prisma.assessment.update({
    where: { id: row.id },
    data: {
      writtenReport: result.report as object,
      jobFitScores: jobFitScores as object,
      topJobMatches: matches as object[],
    },
  });

  return NextResponse.json({ success: true, data: { reportGenerated: true } });
}
