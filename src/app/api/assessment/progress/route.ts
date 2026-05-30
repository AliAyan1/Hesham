import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, AssessmentType, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import {
  ASSESSMENT_PASS_SCORE,
  ASSESSMENT_STEP_COUNT,
  ASSESSMENT_STEPS,
} from "@/lib/assessment/steps";
import {
  computeOverallFromSteps,
  parseStepScores,
  stepKey,
  stepStatus,
} from "@/lib/assessment/step-scores";
import { getJobSeekerTalentPoolStatus } from "@/lib/talent-pool/talent-pool-server";
import { evaluateTalentPoolEntry } from "@/lib/talent-pool/evaluate-talent-pool-entry";
import { evaluateTalentPoolExit } from "@/lib/talent-pool/evaluate-talent-pool-exit";
import type { JobSeekerTalentPoolStatus } from "@/lib/talent-pool/talent-pool-types";
import type { ApiResponse } from "@/types";

export type StepProgressDto = {
  step: number;
  status: "completed" | "in_progress" | "not_started";
  score: number | null;
  canRetake: boolean;
};

export type AssessmentProgressDto = {
  assessmentId: string | null;
  stepsCompleted: number;
  currentStep: number | null;
  overallScore: number | null;
  passed: boolean;
  shareWithEmployers: boolean;
  isFlagged: boolean;
  status: string | null;
  stepScores: ReturnType<typeof parseStepScores>;
  steps: StepProgressDto[];
  proctoringSuspended: boolean;
  proctoringSuspendedUntil: string | null;
  talentPool: JobSeekerTalentPoolStatus;
};

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<ApiResponse<AssessmentProgressDto>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  await evaluateTalentPoolEntry(session.user.id);
  await evaluateTalentPoolExit(session.user.id);
  const talentPool = await getJobSeekerTalentPoolStatus(session.user.id);

  const row = await prisma.assessment.findFirst({
    where: {
      userId: session.user.id,
      type: AssessmentType.GENERAL,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      currentStep: true,
      stepsCompleted: true,
      overallScore: true,
      totalScore: true,
      thinkingStyleScore: true,
      behavioralScore: true,
      interestsScore: true,
      stepScores: true,
      shareWithEmployers: true,
      isFlagged: true,
    },
  });

  const scores = parseStepScores(row?.stepScores);
  const overall =
    row?.overallScore ?? row?.totalScore ?? computeOverallFromSteps(scores);
  const passed = overall != null && overall >= ASSESSMENT_PASS_SCORE;

  const steps: StepProgressDto[] = ASSESSMENT_STEPS.map((cfg) => {
    const entry = scores[stepKey(cfg.id)];
    const st = row
      ? stepStatus(scores, cfg.id, row.currentStep)
      : ("not_started" as const);
    const score = entry?.score ?? null;
    const canRetake =
      !entry ||
      (score != null && score < ASSESSMENT_PASS_SCORE) ||
      (overall != null && overall < ASSESSMENT_PASS_SCORE && score != null && score < ASSESSMENT_PASS_SCORE);
    return {
      step: cfg.id,
      status: st,
      score,
      canRetake,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      assessmentId: row?.id ?? null,
      stepsCompleted: row?.stepsCompleted ?? countCompleted(scores),
      currentStep: row?.currentStep ?? null,
      overallScore: overall,
      passed,
      shareWithEmployers: row?.shareWithEmployers ?? true,
      isFlagged: row?.isFlagged ?? false,
      status: row?.status ?? null,
      stepScores: scores,
      steps,
      proctoringSuspended: talentPool.proctoringSuspended,
      proctoringSuspendedUntil: talentPool.proctoringSuspendedUntil,
      talentPool,
    },
  });
}

function countCompleted(scores: ReturnType<typeof parseStepScores>): number {
  let n = 0;
  for (let i = 1; i <= ASSESSMENT_STEP_COUNT; i++) {
    if (scores[stepKey(i)]) n++;
  }
  return n;
}
