import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { getQuestionsData, getAnswersData, parseTraitScores } from "@/lib/assessment/assessment-data";
import { generateWrittenReport } from "@/lib/assessment/generate-written-report";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { notifyEmployersAboutJobSeeker } from "@/lib/assessment/notify-employers";
import { onAssessmentCompletedForTalentPool } from "@/lib/talent-pool/evaluate-talent-pool-entry";
import { evaluateTalentPoolExit } from "@/lib/talent-pool/evaluate-talent-pool-exit";
import { refreshInvitesAfterAssessment } from "@/lib/talent-pool/talent-pool-invites";
import { onAssessmentComplete } from "@/lib/email-triggers";
import {
  computeCategoryScores,
  computeInterestScores,
  computeTraitScores,
  mergeTraitScores,
} from "@/lib/assessment-scoring";
import { calculateAllJobFits, topRecommendedRoles } from "@/lib/job-fit-calculator";
import {
  ASSESSMENT_PASS_SCORE,
  ASSESSMENT_STEP_COUNT,
  isValidStep,
} from "@/lib/assessment/steps";
import {
  countCompletedSteps,
  parseStepScores,
  stepKey,
  type StepScoresMap,
} from "@/lib/assessment/step-scores";
import type { ProfileXtAnswer, TraitScoresMap } from "@/lib/assessment/profilext-types";
import type { ApiResponse } from "@/types";

const answerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number()]),
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

function stepScoreFromTraits(traitScores: TraitScoresMap): number {
  const vals = Object.values(traitScores).filter((v): v is number => v != null);
  if (!vals.length) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 10);
}

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
  if (!row) {
    return NextResponse.json({ success: false, error: "Assessment not found" }, { status: 404 });
  }

  const questions = getQuestionsData(row);
  if (!questions.length) {
    return NextResponse.json({ success: false, error: "No questions loaded" }, { status: 404 });
  }

  const stepAnswers = parsed.data.answers as ProfileXtAnswer[];
  const stepTraitScores = computeTraitScores(questions, stepAnswers);
  const stepScore = stepScoreFromTraits(stepTraitScores);

  const prevTraitScores = parseTraitScores(row.traitScores) as TraitScoresMap;
  const mergedTraits = mergeTraitScores(prevTraitScores, stepTraitScores);

  const prevAnswers = getAnswersData(row);
  const mergedAnswers = [
    ...prevAnswers.filter((a) => !stepAnswers.some((s) => s.questionId === a.questionId)),
    ...stepAnswers,
  ];

  const interestScores =
    step === 4
      ? computeInterestScores(mergedTraits, questions, stepAnswers)
      : ((row.interestScores as Record<string, number> | null) ?? {});

  const isFlagged = Boolean(parsed.data.isFlagged);
  const prevScores = parseStepScores(row.stepScores);
  const merged: StepScoresMap = { ...prevScores };
  merged[stepKey(step)] = {
    score: stepScore,
    completedAt: new Date().toISOString(),
    strengths: [],
    weaknesses: [],
  };

  const stepsDone = countCompletedSteps(merged);
  const allStepsComplete = stepsDone >= ASSESSMENT_STEP_COUNT;

  let thinkingStyleScore: number | null = row.thinkingStyleScore;
  let behavioralScore: number | null = row.behavioralScore;
  let interestsScore: number | null = row.interestsScore;
  let overallScore: number | null = row.overallScore;
  let jobFitScores: Record<string, number> | null = null;
  let topJobMatches: ReturnType<typeof topRecommendedRoles> | null = null;
  let writtenReport: unknown = row.writtenReport;

  if (allStepsComplete && !isFlagged) {
    const cats = computeCategoryScores(mergedTraits, interestScores);
    thinkingStyleScore = cats.thinkingStyleScore;
    behavioralScore = cats.behavioralScore;
    interestsScore = cats.interestsScore;
    overallScore = cats.overallScore;
    jobFitScores = calculateAllJobFits(mergedTraits, interestScores);
    topJobMatches = topRecommendedRoles(jobFitScores, mergedTraits);

    const reportResult = await generateWrittenReport({
      candidateName: session.user.name ?? "Candidate",
      traitScores: mergedTraits,
      interestScores,
      jobFitScores,
      topJobMatches,
    });
    if (reportResult.ok) writtenReport = reportResult.report;
  }

  const passed =
    overallScore != null ? overallScore >= ASSESSMENT_PASS_SCORE : stepScore >= ASSESSMENT_PASS_SCORE;

  const status = isFlagged
    ? AssessmentStatus.FLAGGED
    : allStepsComplete
      ? AssessmentStatus.COMPLETED
      : AssessmentStatus.IN_PROGRESS;

  const skillsScore = mergedTraits.learningIndicator
    ? Math.round((mergedTraits.learningIndicator ?? 0) * 10)
    : step === 1
      ? stepScore
      : row.skillsScore;
  const communicationScore =
    mergedTraits.verbalSkill != null
      ? Math.round(((mergedTraits.verbalSkill ?? 0) + (mergedTraits.verbalReasoning ?? 0)) / 2 * 10)
      : step === 2
        ? stepScore
        : row.communicationScore;

  await prisma.assessment.update({
    where: { id: row.id },
    data: {
      status,
      stepScores: merged as object,
      stepsCompleted: stepsDone,
      currentStep: allStepsComplete ? null : Math.min(step + 1, ASSESSMENT_STEP_COUNT),
      ...(allStepsComplete ? {} : { questionsData: Prisma.DbNull }),
      answersData: mergedAnswers as object[],
      traitScores: mergedTraits as object,
      interestScores: interestScores as object,
      thinkingStyleScore,
      behavioralScore,
      interestsScore,
      overallScore,
      totalScore: overallScore != null ? Math.round(overallScore) : row.totalScore,
      skillsScore: skillsScore ?? row.skillsScore,
      communicationScore: communicationScore ?? row.communicationScore,
      industryFitScore: interestsScore != null ? Math.round(interestsScore) : row.industryFitScore,
      jobFitScores: jobFitScores as object | undefined,
      topJobMatches: topJobMatches as object[] | undefined,
      writtenReport: writtenReport as object | undefined,
      completedAt: allStepsComplete ? new Date() : null,
      duration: parsed.data.duration ?? null,
      proctoringFlags: (parsed.data.proctoringFlags ?? undefined) as object | undefined,
      isFlagged,
      flagReason: parsed.data.flagReason ?? (isFlagged ? "Proctoring policy violation" : null),
      ...(allStepsComplete ? { shareWithEmployers: true } : {}),
    },
  });

  const stepFeedback =
    stepScore >= 70
      ? "Strong performance on this section."
      : stepScore >= 50
        ? "Solid progress — continue building consistency."
        : "Review this area and consider a retake for improvement.";
  const stepFeedbackAr =
    stepScore >= 70
      ? "أداء قوي في هذا القسم."
      : stepScore >= 50
        ? "تقدم جيد — استمر في بناء الاتساق."
        : "راجع هذا المجال وفكر في إعادة المحاولة للتحسين.";

  const userName = session.user.name ?? null;
  if (allStepsComplete && !isFlagged) {
    await createUserNotification({
      userId: session.user.id,
      title: "Your psychometric assessment is complete",
      titleAr: "اكتمل تقييمك النفسي",
      message: `Overall fit: ${overallScore ?? 0}%`,
      messageAr: `الملاءمة الإجمالية: ${overallScore ?? 0}%`,
      type: "ASSESSMENT_READY",
      link: "/dashboard/job-seeker/assessment/report",
    });
    await notifyEmployersAboutJobSeeker({
      jobSeekerId: session.user.id,
      jobSeekerName: userName,
      title: "{name} completed an assessment",
      titleAr: "أكمل مرشح تقييمًا",
      message: "{name} completed their psychometric assessment.",
      messageAr: "أكمل المرشح التقييم النفسي.",
      linkPath: "/dashboard/employer/candidates",
    });
    if (overallScore != null) {
      await onAssessmentCompletedForTalentPool(session.user.id, Math.round(overallScore));
      await refreshInvitesAfterAssessment(session.user.id);
      await evaluateTalentPoolExit(session.user.id);
    }
    if (session.user.email && overallScore != null) {
      await onAssessmentComplete({
        userId: session.user.id,
        email: session.user.email,
        name: userName ?? "there",
        score: Math.round(overallScore),
        strengths: [],
      });
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
      stepScore,
      allStepsComplete,
      overallScore: overallScore != null ? Math.round(overallScore) : null,
      passed,
      stepFeedback,
      stepFeedbackAr,
    },
  });
}
