import type { VideoInterview } from "@prisma/client";
import { computeFacialAnalysisSummary } from "@/lib/interview/compute-facial-summary";
import type { EnhancedInterviewReport, HiringRecommendation } from "@/lib/interview/enhanced-report-types";

type QuestionItem = { id?: string; question?: string; questionAr?: string };
type TranscriptItem = { questionId?: string; transcript?: string };
type StrengthItem = { title?: string; description?: string; titleAr?: string; descriptionAr?: string };
type ImprovementItem = { title?: string; tip?: string; titleAr?: string; tipAr?: string };
type PerQuestionItem = { questionId?: string; score?: number; feedback?: string; feedbackAr?: string };
type AiAnalysis = { perQuestion?: PerQuestionItem[]; overallFeedback?: string; overallFeedbackAr?: string };

function toTen(score: number | null | undefined, fallback = 5): number {
  if (score == null || Number.isNaN(score)) return fallback;
  if (score > 10) return Math.min(10, Math.max(1, Math.round(score / 10)));
  return Math.min(10, Math.max(1, Math.round(score)));
}

function hiringRec(overallTen: number): HiringRecommendation {
  if (overallTen >= 8) return "STRONGLY_RECOMMEND";
  if (overallTen >= 7) return "RECOMMEND";
  if (overallTen >= 5) return "NEUTRAL";
  if (overallTen >= 4) return "NOT_RECOMMEND";
  return "STRONGLY_NOT_RECOMMEND";
}

function asQuestions(raw: unknown): QuestionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((q): q is QuestionItem => typeof q === "object" && q !== null);
}

function asTranscripts(raw: unknown): TranscriptItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is TranscriptItem => typeof t === "object" && t !== null);
}

function asStrengths(raw: unknown): StrengthItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is StrengthItem => typeof s === "object" && s !== null);
}

function asImprovements(raw: unknown): ImprovementItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((i): i is ImprovementItem => typeof i === "object" && i !== null);
}

function asAiAnalysis(raw: unknown): AiAnalysis {
  if (!raw || typeof raw !== "object") return {};
  return raw as AiAnalysis;
}

export function buildFallbackEnhancedReport(
  row: Pick<
    VideoInterview,
    | "overallScore"
    | "communicationScore"
    | "confidenceScore"
    | "clarityScore"
    | "relevanceScore"
    | "questions"
    | "transcripts"
    | "strengths"
    | "improvements"
    | "aiAnalysis"
  > & {
    user: { name: string | null; email: string };
    facialSnapshots: Array<{
      confidence: number;
      stress: number;
      engagement: number;
      authenticity: number;
      primaryEmotion: string;
      eyeContact: string;
      posture: string;
      questionNumber: number;
    }>;
  },
  jobTitle: string,
): EnhancedInterviewReport {
  const questions = asQuestions(row.questions);
  const transcripts = asTranscripts(row.transcripts);
  const strengths = asStrengths(row.strengths);
  const improvements = asImprovements(row.improvements);
  const ai = asAiAnalysis(row.aiAnalysis);
  const facialSummary = computeFacialAnalysisSummary(row.facialSnapshots);

  const overallTen = toTen(row.overallScore);
  const commTen = toTen(row.communicationScore, overallTen);
  const confTen = toTen(row.confidenceScore, overallTen);
  const clarityTen = toTen(row.clarityScore, overallTen);
  const relTen = toTen(row.relevanceScore, overallTen);
  const contentTen = Math.round((clarityTen + relTen) / 2);
  const behavioralTen = Math.round((confTen + commTen) / 2);

  const summaryEn =
    ai.overallFeedback?.trim() ||
    `Interview completed for ${jobTitle}. Overall performance scored ${overallTen}/10 based on communication, clarity, and role relevance.`;
  const summaryAr =
    ai.overallFeedbackAr?.trim() ||
    `أكمل المرشح المقابلة لوظيفة ${jobTitle}. الأداء العام ${overallTen}/10 بناءً على التواصل والوضوح والملاءمة للدور.`;

  const facialConf = facialSummary ? toTen(facialSummary.averageConfidence) : confTen;
  const facialStress = facialSummary ? toTen(facialSummary.averageStress) : 5;
  const facialEng = facialSummary ? toTen(facialSummary.averageEngagement) : commTen;
  const facialAuth = facialSummary ? toTen(facialSummary.averageAuthenticity) : confTen;

  const questionByQuestion = (questions.length ? questions : transcripts).map((q, i) => {
    const qid = "id" in q ? q.id : undefined;
    const text = "question" in q && q.question ? q.question : `Question ${i + 1}`;
    const tx =
      transcripts.find((t) => t.questionId === qid)?.transcript ??
      transcripts[i]?.transcript ??
      "";
    const pq = ai.perQuestion?.find((p) => p.questionId === qid) ?? ai.perQuestion?.[i];
    const quality = toTen(pq?.score, overallTen);
    return {
      questionNumber: i + 1,
      questionText: text,
      answerQuality: quality,
      keyPoints: tx.trim() ? [tx.trim().slice(0, 120)] : ["Answer recorded"],
      missedOpportunities: [] as string[],
      facialDuringAnswer: facialSummary
        ? `Dominant emotion trend: ${facialSummary.dominantEmotion}`
        : "No facial capture data for this session.",
      feedbackEN: pq?.feedback?.trim() || `Answer quality scored ${quality}/10.`,
      feedbackAR: pq?.feedbackAr?.trim() || `جودة الإجابة ${quality}/10.`,
    };
  });

  return {
    executiveSummary: {
      overallRating: overallTen,
      hiringRecommendation: hiringRec(overallTen),
      summaryEN: summaryEn,
      summaryAR: summaryAr,
    },
    communicationAnalysis: {
      score: commTen,
      clarity: clarityTen,
      articulation: commTen,
      vocabulary: commTen,
      responseRelevance: relTen,
      strengths: strengths.slice(0, 3).map((s) => s.title ?? "").filter(Boolean),
      weaknesses: improvements.slice(0, 2).map((i) => i.title ?? "").filter(Boolean),
      detailEN: summaryEn,
      detailAR: summaryAr,
    },
    contentAnalysis: {
      score: contentTen,
      relevanceToRole: relTen,
      examplesQuality: contentTen,
      problemSolvingShown: contentTen,
      industryKnowledge: contentTen,
      keyInsights: strengths.slice(0, 3).map((s) => s.description ?? s.title ?? "").filter(Boolean),
      redFlags: [],
      detailEN: `Content relevance and clarity averaged ${contentTen}/10 for ${jobTitle}.`,
      detailAR: `متوسط ملاءمة المحتوى والوضوح ${contentTen}/10 لوظيفة ${jobTitle}.`,
    },
    behavioralAnalysis: {
      score: behavioralTen,
      leadershipPotential: behavioralTen,
      teamworkOrientation: behavioralTen,
      problemSolvingApproach: contentTen,
      adaptability: behavioralTen,
      motivationLevel: confTen,
      culturalFit: behavioralTen,
      behavioralPatterns: [],
      detailEN: `Behavioral indicators suggest ${behavioralTen}/10 fit based on confidence and communication signals.`,
      detailAR: `المؤشرات السلوكية تشير إلى ملاءمة ${behavioralTen}/10 بناءً على الثقة والتواصل.`,
    },
    facialExpressionAnalysis: {
      overallConfidenceScore: facialConf,
      averageStressLevel: facialStress,
      engagementLevel: facialEng,
      authenticityScore: facialAuth,
      emotionTimeline: [
        {
          phase: "Opening",
          dominantEmotion: facialSummary?.dominantEmotion ?? "neutral",
          interpretation: "Initial composure during interview start.",
        },
        {
          phase: "Mid-Interview",
          dominantEmotion: facialSummary?.dominantEmotion ?? "focused",
          interpretation: "Sustained engagement while answering questions.",
        },
        {
          phase: "Closing",
          dominantEmotion: facialSummary?.dominantEmotion ?? "neutral",
          interpretation: "Maintained presence through final responses.",
        },
      ],
      eyeContactAssessment:
        facialSummary?.eyeContactTrend ?? "Eye contact data not available for this interview.",
      postureAssessment: facialSummary?.postureTrend ?? "Posture data not available for this interview.",
      notableObservations: facialSummary
        ? [`Captured ${facialSummary.snapshotCount} facial snapshots during the session.`]
        : ["No facial analysis snapshots were captured for this interview."],
      facialSummaryEN: facialSummary
        ? `Average confidence ${facialConf}/10, engagement ${facialEng}/10 across ${facialSummary.snapshotCount} snapshots.`
        : "Facial analysis was not available; scores reflect interview performance only.",
      facialSummaryAR: facialSummary
        ? `متوسط الثقة ${facialConf}/10 والمشاركة ${facialEng}/10 عبر ${facialSummary.snapshotCount} لقطة.`
        : "تحليل الوجه غير متاح؛ الدرجات تعكس أداء المقابلة فقط.",
    },
    questionByQuestionAnalysis: questionByQuestion.length
      ? questionByQuestion
      : [
          {
            questionNumber: 1,
            questionText: "Interview responses",
            answerQuality: overallTen,
            keyPoints: [summaryEn.slice(0, 160)],
            missedOpportunities: [],
            facialDuringAnswer: "N/A",
            feedbackEN: summaryEn,
            feedbackAR: summaryAr,
          },
        ],
    strengthsAndWeaknesses: {
      topStrengths: strengths.slice(0, 3).map((s) => ({
        strength: s.title ?? "Strength",
        evidence: s.description ?? "",
        relevanceToRole: overallTen,
      })),
      developmentAreas: improvements.slice(0, 3).map((i) => ({
        area: i.title ?? "Development area",
        observation: i.tip ?? "",
        recommendation: i.tip ?? "Practice structured answers with concrete examples.",
      })),
    },
    roleCompatibility: {
      technicalFit: contentTen,
      culturalFit: behavioralTen,
      experienceFit: relTen,
      motivationFit: confTen,
      overallFit: overallTen,
      fitExplanationEN: `Overall role fit estimated at ${overallTen}/10 for ${jobTitle}.`,
      fitExplanationAR: `ملاءمة الدور الإجمالية تقدر بـ ${overallTen}/10 لوظيفة ${jobTitle}.`,
    },
    hiringManagerNotes: {
      suggestedFollowUpQuestions: [
        "Walk me through a recent project most relevant to this role.",
        "How do you handle ambiguity when requirements change?",
      ],
      areasToExploreMore: improvements.slice(0, 2).map((i) => i.title ?? "").filter(Boolean),
      onboardingConsiderations: [],
      salaryBenchmark: "Benchmark against market rates for this role and experience level.",
      finalRecommendationEN: summaryEn,
      finalRecommendationAR: summaryAr,
    },
  };
}
