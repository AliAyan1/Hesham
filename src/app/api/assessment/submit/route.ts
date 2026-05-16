import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { notifyEmployersAboutJobSeeker } from "@/lib/assessment/notify-employers";
import { onAssessmentCompletedForTalentPool } from "@/lib/talent-pool/evaluate-talent-pool-entry";
import { evaluateTalentPoolExit } from "@/lib/talent-pool/evaluate-talent-pool-exit";
import { refreshInvitesAfterAssessment } from "@/lib/talent-pool/talent-pool-invites";
import { assessmentStepTitle } from "@/lib/assessment/question-prompts";
import {
  ASSESSMENT_PASS_SCORE,
  ASSESSMENT_STEP_COUNT,
  isValidStep,
  stepConfig,
} from "@/lib/assessment/steps";
import {
  computeOverallFromSteps,
  countCompletedSteps,
  parseStepScores,
  stepKey,
  type StepScoresMap,
} from "@/lib/assessment/step-scores";
import type { ApiResponse } from "@/types";

const answerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const bodySchema = z.object({
  assessmentId: z.string(),
  step: z.number().int().min(1).max(5),
  answers: z.array(answerSchema).min(1),
  duration: z.number().int().min(0).max(8 * 60 * 60).optional(),
  proctoringFlags: z.record(z.string(), z.unknown()).optional(),
  isFlagged: z.boolean().optional(),
  flagReason: z.string().max(2000).optional(),
});

const strengthSchema = z.object({
  title: z.string(),
  titleAr: z.string(),
  description: z.string(),
  descriptionAr: z.string(),
});

const weaknessSchema = z.object({
  title: z.string(),
  titleAr: z.string(),
  description: z.string(),
  tip: z.string(),
  tipAr: z.string(),
});

const stepScorePackSchema = z.object({
  stepScore: z.number().min(0).max(100),
  strengths: z.array(strengthSchema).min(1).max(5),
  weaknesses: z.array(weaknessSchema).min(1).max(5),
  stepFeedback: z.string(),
  stepFeedbackAr: z.string(),
});

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{
      assessmentId: string;
      step: number;
      stepScore: number;
      allStepsComplete: boolean;
      overallScore: number | null;
      passed: boolean;
      strengths: z.infer<typeof strengthSchema>[];
      weaknesses: z.infer<typeof weaknessSchema>[];
      stepFeedback: string;
      stepFeedbackAr: string;
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

  const step = parsed.data.step;
  if (!isValidStep(step)) {
    return NextResponse.json({ success: false, error: "Invalid step" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.assessment.findFirst({
    where: {
      id: parsed.data.assessmentId,
      userId: session.user.id,
      status: AssessmentStatus.IN_PROGRESS,
    },
  });
  if (!row || !row.questions) {
    return NextResponse.json({ success: false, error: "Assessment not found" }, { status: 404 });
  }

  const cfg = stepConfig(step)!;
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  const cv = await prisma.cV.findUnique({ where: { userId: session.user.id } });
  const profileSnippet = JSON.stringify(
    {
      bio: profile?.bio,
      professionalTitle: cv?.professionalTitle,
      summary: cv?.summary,
    },
    null,
    2,
  ).slice(0, 8000);

  const payload = {
    step,
    stepTitle: assessmentStepTitle(step),
    questions: row.questions,
    answers: parsed.data.answers,
    candidateProfile: profileSnippet,
  };

  const userPrompt =
    `Score STEP ${step} (${assessmentStepTitle(step)}) of a universal job seeker assessment.\n` +
    `Questions are for ANY industry — score reasoning and professionalism, not specialist knowledge.\n` +
    `Focus: ${cfg.promptFocus}\n\n` +
    `Questions and answers JSON:\n${JSON.stringify(payload).slice(0, 24000)}\n\n` +
    `Return ONLY this JSON (no markdown):\n` +
    `{"stepScore":0-100,"strengths":[{"title":"","titleAr":"","description":"","descriptionAr":""}],` +
    `"weaknesses":[{"title":"","titleAr":"","description":"","tip":"","tipAr":""}],` +
    `"stepFeedback":"","stepFeedbackAr":""}`;

  const claude = await fetchClaudeJsonText({
    system:
      "You output a single JSON object only. Score fairly based on answer quality. Be constructive.",
    user: userPrompt,
    maxTokens: 4096,
  });

  if (!claude.ok) {
    return NextResponse.json({ success: false, error: "Scoring service unavailable" }, { status: 503 });
  }

  let scores: z.infer<typeof stepScorePackSchema>;
  try {
    const json = parseJsonFromModel(claude.text);
    const v = stepScorePackSchema.safeParse(json);
    if (!v.success) {
      return NextResponse.json({ success: false, error: "Invalid scoring response" }, { status: 502 });
    }
    scores = v.data;
  } catch {
    return NextResponse.json({ success: false, error: "Could not parse scoring response" }, { status: 502 });
  }

  const isFlagged = Boolean(parsed.data.isFlagged);
  const prevScores = parseStepScores(row.stepScores);
  const merged: StepScoresMap = { ...prevScores };
  merged[stepKey(step)] = {
    score: scores.stepScore,
    completedAt: new Date().toISOString(),
    strengths: scores.strengths,
    weaknesses: scores.weaknesses,
  };

  const stepsDone = countCompletedSteps(merged);
  const allStepsComplete = stepsDone >= ASSESSMENT_STEP_COUNT;
  const overallScore = allStepsComplete ? computeOverallFromSteps(merged) : null;
  const passed = overallScore != null ? overallScore >= ASSESSMENT_PASS_SCORE : scores.stepScore >= ASSESSMENT_PASS_SCORE;

  const skillsScore = merged.step1?.score ?? row.skillsScore ?? 0;
  const communicationScore = merged.step2?.score ?? row.communicationScore ?? 0;
  const industryFitScore = merged.step4?.score ?? row.industryFitScore ?? 0;
  const behavioralScore =
    merged.step3 && merged.step5
      ? Math.round((merged.step3.score + merged.step5.score) / 2)
      : merged.step3?.score ?? merged.step5?.score ?? row.behavioralScore ?? 0;

  const allStrengths = Object.values(merged).flatMap((e) =>
    Array.isArray(e?.strengths) ? e.strengths : [],
  );
  const allWeaknesses = Object.values(merged).flatMap((e) =>
    Array.isArray(e?.weaknesses) ? e.weaknesses : [],
  );

  let recommendations: object[] = [];
  if (allStepsComplete && !isFlagged) {
    const recoSchema = z.object({
      recommendations: z
        .array(
          z.object({
            type: z.enum(["job", "training", "skill"]),
            title: z.string(),
            titleAr: z.string(),
            description: z.string(),
          }),
        )
        .min(1)
        .max(8),
    });
    const recoPrompt =
      `Based on 5-step assessment scores (overall ${overallScore}/100), suggest career recommendations.\n` +
      `Step scores JSON: ${JSON.stringify(merged).slice(0, 4000)}\n` +
      `Return ONLY: {"recommendations":[{"type":"job"|"training"|"skill","title":"","titleAr":"","description":""}]}`;
    const recoAi = await fetchClaudeJsonText({
      system: "Output JSON only.",
      user: recoPrompt,
      maxTokens: 2048,
    });
    if (recoAi.ok) {
      try {
        const recoJson = parseJsonFromModel(recoAi.text);
        const rv = recoSchema.safeParse(recoJson);
        if (rv.success) recommendations = rv.data.recommendations;
      } catch {
        /* optional */
      }
    }
  }

  const status =
    isFlagged
      ? AssessmentStatus.FLAGGED
      : allStepsComplete
        ? AssessmentStatus.COMPLETED
        : AssessmentStatus.IN_PROGRESS;

  await prisma.assessment.update({
    where: { id: row.id },
    data: {
      status,
      stepScores: merged as object,
      stepsCompleted: stepsDone,
      currentStep: allStepsComplete ? null : Math.min(step + 1, ASSESSMENT_STEP_COUNT),
      questions: allStepsComplete ? row.questions : Prisma.DbNull,
      answers: parsed.data.answers as object[],
      totalScore: overallScore,
      skillsScore: merged.step1?.score ?? skillsScore,
      communicationScore: merged.step2?.score ?? communicationScore,
      behavioralScore:
        merged.step3 && merged.step5
          ? Math.round((merged.step3.score + merged.step5.score) / 2)
          : merged.step3?.score ?? behavioralScore,
      industryFitScore: merged.step4?.score ?? industryFitScore,
      strengths: (allStrengths.length ? allStrengths : scores.strengths) as object[],
      weaknesses: (allWeaknesses.length ? allWeaknesses : scores.weaknesses) as object[],
      recommendations: recommendations.length ? (recommendations as object[]) : undefined,
      detailedReport: {
        stepScores: merged,
        lastStep: step,
        stepFeedback: scores.stepFeedback,
        stepFeedbackAr: scores.stepFeedbackAr,
        answers: parsed.data.answers,
      } as object,
      completedAt: allStepsComplete ? new Date() : null,
      duration: parsed.data.duration ?? null,
      proctoringFlags: (parsed.data.proctoringFlags ?? undefined) as object | undefined,
      isFlagged,
      flagReason: parsed.data.flagReason ?? (isFlagged ? "Proctoring policy violation" : null),
    },
  });

  const userName = session.user.name ?? null;
  if (allStepsComplete && !isFlagged) {
    await createUserNotification({
      userId: session.user.id,
      title: "Your AI assessment is complete",
      titleAr: "اكتمل تقييم الذكاء الاصطناعي",
      message: `Overall score: ${overallScore}/100`,
      messageAr: `الدرجة الإجمالية: ${overallScore}/100`,
      type: "ASSESSMENT_READY",
      link: "/dashboard/job-seeker/assessment",
    });
    await notifyEmployersAboutJobSeeker({
      jobSeekerId: session.user.id,
      jobSeekerName: userName,
      title: "{name} completed an assessment",
      titleAr: "أكمل مرشح تقييمًا",
      message: "{name} completed their AI assessment.",
      messageAr: "أكمل المرشح تقييم الذكاء الاصطناعي.",
      linkPath: "/dashboard/employer/candidates",
    });
    if (overallScore != null) {
      await onAssessmentCompletedForTalentPool(session.user.id, overallScore);
      await refreshInvitesAfterAssessment(session.user.id);
      await evaluateTalentPoolExit(session.user.id);
    }
  } else if (isFlagged) {
    await createUserNotification({
      userId: session.user.id,
      title: "Assessment flagged for review",
      titleAr: "تم الإبلاغ عن التقييم للمراجعة",
      message: "Your assessment step was flagged.",
      messageAr: "تم الإبلاغ عن خطوة التقييم.",
      type: "ASSESSMENT_FLAGGED",
      link: "/dashboard/job-seeker/assessment",
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      assessmentId: row.id,
      step,
      stepScore: scores.stepScore,
      allStepsComplete,
      overallScore,
      passed,
      strengths: scores.strengths,
      weaknesses: scores.weaknesses,
      stepFeedback: scores.stepFeedback,
      stepFeedbackAr: scores.stepFeedbackAr,
    },
  });
}
