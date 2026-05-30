import { InterviewStatus, NotificationType, TalentPoolReason, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { notifyEmployersAboutJobSeeker } from "@/lib/assessment/notify-employers";
import type { ApiResponse } from "@/types";
import { addTalentPoolEntry } from "@/lib/talent-pool/add-talent-pool-entry";
import { onInterviewComplete } from "@/lib/email-triggers";
import { getAnalysisLanguageInstruction } from "@/lib/interview/locale-language";

const itemSchema = z.object({
  questionId: z.string(),
  transcript: z.string(),
});

const bodySchema = z.object({
  interviewId: z.string(),
  items: z.array(itemSchema).min(1),
  proctoringFlags: z.record(z.string(), z.unknown()).optional(),
  isFlagged: z.boolean().optional(),
  durationSeconds: z.number().int().min(0).max(7200).optional(),
  locale: z.string().max(8).optional(),
});

const perQSchema = z.object({
  questionId: z.string(),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  feedbackAr: z.string(),
});

const strengthSchema = z.object({
  title: z.string(),
  description: z.string(),
  titleAr: z.string(),
  descriptionAr: z.string(),
});

const improveSchema = z.object({
  title: z.string(),
  tip: z.string(),
  titleAr: z.string(),
  tipAr: z.string(),
});

const analysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  perQuestion: z.array(perQSchema).min(1).max(20),
  strengths: z.array(strengthSchema).min(1).max(8),
  improvements: z.array(improveSchema).min(1).max(8),
  overallFeedback: z.string(),
  overallFeedbackAr: z.string(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<z.infer<typeof analysisSchema> & { interviewId: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.videoInterview.findFirst({
    where: {
      id: parsed.data.interviewId,
      userId: session.user.id,
      status: InterviewStatus.IN_PROGRESS,
    },
  });
  if (!row || !row.questions) {
    return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
  }

  if (row.interviewKind === "practice") {
    const practiceAnalysis = {
      overallScore: 80,
      communicationScore: 80,
      confidenceScore: 80,
      clarityScore: 80,
      relevanceScore: 80,
      perQuestion: parsed.data.items.map((item) => ({
        questionId: item.questionId,
        score: 80,
        feedback: "Good practice response.",
        feedbackAr: "إجابة تدريبية جيدة.",
      })),
      strengths: [
        {
          title: "Practice complete",
          description: "You finished the warm-up interview with Lara.",
          titleAr: "اكتمل التدريب",
          descriptionAr: "أنهيت مقابلة التعارف مع لارا.",
        },
      ],
      improvements: [
        {
          title: "Next step",
          tip: "Start a real job interview when you are invited.",
          titleAr: "الخطوة التالية",
          tipAr: "ابدأ مقابلة الوظيفة الحقيقية عند استلام الدعوة.",
        },
      ],
      overallFeedback: "Great practice! You're ready for your real interview.",
      overallFeedbackAr: "تدريب رائع! أنت جاهز لمقابلتك الحقيقية.",
    };

    await prisma.videoInterview.update({
      where: { id: row.id },
      data: {
        status: InterviewStatus.COMPLETED,
        transcripts: parsed.data.items as object[],
        answers: parsed.data.items as object[],
        overallScore: practiceAnalysis.overallScore,
        communicationScore: practiceAnalysis.communicationScore,
        confidenceScore: practiceAnalysis.confidenceScore,
        clarityScore: practiceAnalysis.clarityScore,
        relevanceScore: practiceAnalysis.relevanceScore,
        strengths: practiceAnalysis.strengths as object[],
        improvements: practiceAnalysis.improvements as object[],
        aiAnalysis: {
          perQuestion: practiceAnalysis.perQuestion,
          overallFeedback: practiceAnalysis.overallFeedback,
          overallFeedbackAr: practiceAnalysis.overallFeedbackAr,
        } as object,
        completedAt: new Date(),
        duration: parsed.data.durationSeconds ?? null,
        proctoringFlags: (parsed.data.proctoringFlags ?? undefined) as object | undefined,
        isFlagged: false,
      },
    });

    return NextResponse.json(
      { success: true, data: { interviewId: row.id, ...practiceAnalysis } },
      { status: 200 },
    );
  }

  const payload = {
    questions: row.questions,
    transcripts: parsed.data.items,
  };

  const locale = parsed.data.locale ?? "en";
  const langInstr = getAnalysisLanguageInstruction(locale);

  const userPrompt =
    `You are an expert HR interviewer.\n` +
    `${langInstr}\n` +
    `Analyze these interview responses and return scores.\n\n` +
    `Data JSON:\n${JSON.stringify(payload).slice(0, 28000)}\n\n` +
    `Return ONLY JSON (no markdown):\n` +
    `{"overallScore":0-100,"communicationScore":0-100,"confidenceScore":0-100,"clarityScore":0-100,"relevanceScore":0-100,` +
    `"perQuestion":[{"questionId":"","score":0-100,"feedback":"","feedbackAr":""}],` +
    `"strengths":[{"title":"","description":"","titleAr":"","descriptionAr":""}],` +
    `"improvements":[{"title":"","tip":"","titleAr":"","tipAr":""}],` +
    `"overallFeedback":"","overallFeedbackAr":""}`;

  const claude = await fetchClaudeJsonText({
    system:
      "You output a single JSON object only. Plain UTF-8. No markdown fences. Be fair and constructive.",
    user: userPrompt,
    maxTokens: 8192,
  });

  if (!claude.ok) {
    return NextResponse.json({ success: false, error: "Analysis unavailable" }, { status: 503 });
  }

  let analysis: z.infer<typeof analysisSchema>;
  try {
    const json = parseJsonFromModel(claude.text);
    const v = analysisSchema.safeParse(json);
    if (!v.success) {
      return NextResponse.json({ success: false, error: "Invalid analysis shape" }, { status: 502 });
    }
    analysis = v.data;
  } catch {
    return NextResponse.json({ success: false, error: "Parse error" }, { status: 502 });
  }

  const isFlagged = Boolean(parsed.data.isFlagged);
  const status = isFlagged ? InterviewStatus.FLAGGED : InterviewStatus.COMPLETED;

  const aiAnalysis = {
    perQuestion: analysis.perQuestion,
    overallFeedback: analysis.overallFeedback,
    overallFeedbackAr: analysis.overallFeedbackAr,
  };

  await prisma.videoInterview.update({
    where: { id: row.id },
    data: {
      status,
      transcripts: parsed.data.items as object[],
      answers: parsed.data.items as object[],
      overallScore: analysis.overallScore,
      communicationScore: analysis.communicationScore,
      confidenceScore: analysis.confidenceScore,
      clarityScore: analysis.clarityScore,
      relevanceScore: analysis.relevanceScore,
      strengths: analysis.strengths as object[],
      improvements: analysis.improvements as object[],
      aiAnalysis: aiAnalysis as object,
      completedAt: new Date(),
      duration: parsed.data.durationSeconds ?? null,
      proctoringFlags: (parsed.data.proctoringFlags ?? undefined) as object | undefined,
      isFlagged,
    },
  });

  if (!isFlagged && analysis.overallScore < 50) {
    await addTalentPoolEntry({
      userId: session.user.id,
      reason: TalentPoolReason.INTERVIEW_LOW_SCORE,
      sourceInterviewId: row.id,
      improvements: analysis.improvements,
    });
  }

  const userName = session.user.name ?? null;

  await createUserNotification({
    userId: session.user.id,
    title: isFlagged ? "Interview flagged for review" : "Your interview analysis is complete!",
    titleAr: isFlagged ? "تم الإبلاغ عن المقابلة" : "تحليل المقابلة جاهز!",
    message: isFlagged
      ? "Your interview was flagged for review."
      : `Your interview analysis is complete! Score: ${analysis.overallScore}/100`,
    messageAr: isFlagged
      ? "تم الإبلاغ عن مقابلتك."
      : `اكتمل تحليل المقابلة! الدرجة: ${analysis.overallScore}/100`,
    type: isFlagged ? NotificationType.ASSESSMENT_FLAGGED : NotificationType.INTERVIEW_READY,
    link: "/dashboard/job-seeker/interview",
  });

  if (isFlagged) {
    await notifyEmployersAboutJobSeeker({
      jobSeekerId: session.user.id,
      jobSeekerName: userName,
      title: "{name}'s interview was flagged ⚠️",
      titleAr: "تم الإبلاغ عن مقابلة المرشح",
      message: "{name}'s video interview was flagged for review.",
      messageAr: "تم الإبلاغ عن مقابلة المرشح.",
      linkPath: "/dashboard/employer/candidates",
    });
  } else {
    await notifyEmployersAboutJobSeeker({
      jobSeekerId: session.user.id,
      jobSeekerName: userName,
      title: "{name} completed their video interview",
      titleAr: "أكمل المرشح مقابلة فيديو",
      message: "{name} completed a video interview.",
      messageAr: "أكمل المرشح مقابلة فيديو.",
      linkPath: "/dashboard/employer/candidates",
    });
  }

  if (!isFlagged && session.user.email) {
    let applicationId: string | undefined;
    let employerEmail: string | undefined;
    if (row.jobId) {
      const app = await prisma.application.findFirst({
        where: { jobId: row.jobId, jobSeekerId: session.user.id },
        select: {
          id: true,
          job: { select: { employer: { select: { email: true } } } },
        },
      });
      applicationId = app?.id;
      employerEmail = app?.job.employer.email ?? undefined;
    }
    await onInterviewComplete({
      seekerId: session.user.id,
      seekerEmail: session.user.email,
      seekerName: userName ?? "Candidate",
      score: analysis.overallScore,
      employerEmail,
      applicationId,
    });
  }

  return NextResponse.json(
    { success: true, data: { interviewId: row.id, ...analysis } },
    { status: 200 },
  );
}
