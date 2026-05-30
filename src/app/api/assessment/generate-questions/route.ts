import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, AssessmentType, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { getQuestionsData } from "@/lib/assessment/assessment-data";
import { buildProfileXtQuestionPrompt } from "@/lib/assessment/profilext-prompts";
import type { ProfileXtQuestion } from "@/lib/assessment/profilext-types";
import {
  isValidStep,
  stepConfig,
  type AssessmentStepId,
} from "@/lib/assessment/steps";
import { canStartStep, countCompletedSteps, parseStepScores, stepKey } from "@/lib/assessment/step-scores";
import { getProctoringSuspensionPayload } from "@/lib/assessment/check-proctoring-suspension";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  step: z.number().int().min(1).max(5),
  forceRetake: z.boolean().optional(),
  assessmentId: z.string().optional(),
});

const questionItemSchema = z.object({
  id: z.string(),
  trait: z.string(),
  category: z.enum(["thinking", "behavioral", "interests", "situational"]),
  type: z.enum(["mcq", "likert", "forced_choice", "rating"]),
  question: z.string(),
  questionAr: z.string(),
  options: z.array(z.string()).nullable(),
  optionsAr: z.array(z.string()).nullable(),
  correctAnswer: z.string().nullable(),
  timeLimit: z.number().int().min(15).max(600),
});

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{
      assessmentId: string;
      questions: ProfileXtQuestion[];
      step: number;
      stepTimeLimitSec: number;
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const step = parsed.data.step as AssessmentStepId;
  if (!isValidStep(step)) {
    return NextResponse.json({ success: false, error: "Invalid step" }, { status: 400 });
  }

  const cfg = stepConfig(step)!;
  const prisma = getPrisma();
  const userId = session.user.id;

  const suspension = await getProctoringSuspensionPayload(userId);
  if (suspension) {
    return NextResponse.json(
      { success: false, error: suspension.error, cooldownUntil: suspension.cooldownUntil },
      { status: 403 },
    );
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { dataConsentAssessmentAt: true, name: true },
  });
  if (!userRow?.dataConsentAssessmentAt) {
    return NextResponse.json({ success: false, error: "consent_required" }, { status: 403 });
  }

  let assessment = await prisma.assessment.findFirst({
    where: {
      userId,
      type: AssessmentType.GENERAL,
      status: { in: [AssessmentStatus.IN_PROGRESS, AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!assessment && parsed.data.assessmentId) {
    assessment = await prisma.assessment.findFirst({
      where: { id: parsed.data.assessmentId, userId },
    });
  }

  const stepScores = parseStepScores(assessment?.stepScores);
  const overall = assessment?.overallScore ?? assessment?.totalScore ?? null;

  if (stepScores[stepKey(step)] && !canStartStep(stepScores, step, { forceRetake: parsed.data.forceRetake, overallScore: overall != null ? Math.round(overall) : null })) {
    return NextResponse.json(
      { success: false, error: "Step already completed. Use retake to try again." },
      { status: 409 },
    );
  }

  if (
    assessment?.status === AssessmentStatus.IN_PROGRESS &&
    assessment.currentStep === step &&
    !parsed.data.forceRetake
  ) {
    const existingQs = getQuestionsData(assessment);
    if (existingQs.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          assessmentId: assessment.id,
          questions: existingQs,
          step,
          stepTimeLimitSec: cfg.stepTimeLimitSec,
        },
      });
    }
  }

  const { system, user: userPrompt } = buildProfileXtQuestionPrompt(step, cfg, {
    retake: Boolean(parsed.data.forceRetake || stepScores[stepKey(step)]),
    candidateName: userRow.name ?? undefined,
  });

  const claude = await fetchClaudeJsonText({ system, user: userPrompt, maxTokens: 16000 });

  if (!claude.ok) {
    const msg =
      claude.error === "missing_key"
        ? "Assessment AI is not configured."
        : "Could not generate questions. Try again.";
    return NextResponse.json({ success: false, error: msg }, { status: 503 });
  }

  let questions: ProfileXtQuestion[];
  try {
    const json = parseJsonFromModel(claude.text);
    const arr = (json as { questions?: unknown }).questions;
    if (!Array.isArray(arr)) {
      return NextResponse.json({ success: false, error: "Invalid AI response shape" }, { status: 502 });
    }
    const validated: ProfileXtQuestion[] = [];
    for (const item of arr.slice(0, cfg.questionCount + 5)) {
      const v = questionItemSchema.safeParse(item);
      if (v.success) validated.push(v.data as ProfileXtQuestion);
    }
    if (validated.length < Math.min(5, cfg.questionCount)) {
      return NextResponse.json({ success: false, error: "Not enough valid questions" }, { status: 502 });
    }
    questions = validated.slice(0, cfg.questionCount);
  } catch {
    return NextResponse.json({ success: false, error: "Could not parse AI response" }, { status: 502 });
  }

  const questionPayload = questions as object[];

  if (assessment?.id && assessment.status === AssessmentStatus.IN_PROGRESS) {
    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        questionsData: questionPayload,
        currentStep: step,
        startedAt: assessment.startedAt ?? new Date(),
        answersData: Prisma.DbNull,
      },
      select: { id: true },
    });
    return NextResponse.json({
      success: true,
      data: { assessmentId: updated.id, questions, step, stepTimeLimitSec: cfg.stepTimeLimitSec },
    });
  }

  if (assessment?.status === AssessmentStatus.COMPLETED || assessment?.status === AssessmentStatus.FLAGGED) {
    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: AssessmentStatus.IN_PROGRESS,
        questionsData: questionPayload,
        currentStep: step,
        startedAt: new Date(),
        answersData: Prisma.DbNull,
        isFlagged: false,
        flagReason: null,
        retakeCount: { increment: 1 },
        lastRetakeAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json({
      success: true,
      data: { assessmentId: updated.id, questions, step, stepTimeLimitSec: cfg.stepTimeLimitSec },
    });
  }

  const created = await prisma.assessment.create({
    data: {
      userId,
      type: AssessmentType.GENERAL,
      status: AssessmentStatus.IN_PROGRESS,
      questionsData: questionPayload,
      currentStep: step,
      stepsCompleted: countCompletedSteps(parseStepScores(assessment?.stepScores)),
      stepScores: assessment?.stepScores ?? undefined,
      startedAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json(
    {
      success: true,
      data: { assessmentId: created.id, questions, step, stepTimeLimitSec: cfg.stepTimeLimitSec },
    },
    { status: 201 },
  );
}
