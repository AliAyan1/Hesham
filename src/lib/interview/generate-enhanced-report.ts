import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { computeFacialAnalysisSummary } from "@/lib/interview/compute-facial-summary";
import {
  enhancedInterviewReportSchema,
  type EnhancedInterviewReport,
} from "@/lib/interview/enhanced-report-types";

type QuestionItem = { id?: string; question?: string; questionAr?: string; timeLimit?: number };
type TranscriptItem = { questionId?: string; transcript?: string };

function asQuestions(raw: unknown): QuestionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((q): q is QuestionItem => typeof q === "object" && q !== null);
}

function asTranscripts(raw: unknown): TranscriptItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is TranscriptItem => typeof t === "object" && t !== null);
}

export async function generateEnhancedInterviewReport(interviewId: string): Promise<EnhancedInterviewReport | null> {
  const prisma = getPrisma();
  const row = await prisma.videoInterview.findUnique({
    where: { id: interviewId },
    include: {
      user: { select: { name: true, email: true } },
      facialSnapshots: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!row || row.interviewKind === "practice") return null;

  let jobTitle = "Role";
  if (row.jobId) {
    const job = await prisma.job.findUnique({ where: { id: row.jobId }, select: { title: true } });
    if (job?.title) jobTitle = job.title;
  }

  let assessmentScores: Record<string, number | null> | null = null;
  if (row.assessmentId) {
    const a = await prisma.assessment.findUnique({
      where: { id: row.assessmentId },
      select: {
        totalScore: true,
        thinkingStyleScore: true,
        behavioralScore: true,
        skillsScore: true,
        communicationScore: true,
      },
    });
    if (a) {
      assessmentScores = {
        totalScore: a.totalScore,
        thinkingStyleScore: a.thinkingStyleScore,
        behavioralScore: a.behavioralScore,
        skillsScore: a.skillsScore,
        communicationScore: a.communicationScore,
      };
    }
  }

  const questions = asQuestions(row.questions);
  const transcripts = asTranscripts(row.transcripts);
  const facialSummary = computeFacialAnalysisSummary(row.facialSnapshots);

  const qaLines = questions.map((q, i) => {
    const tx =
      transcripts.find((t) => t.questionId === q.id)?.transcript ??
      transcripts[i]?.transcript ??
      "";
    return `Q${i + 1}: ${q.question ?? ""}\nAnswer: ${tx}`;
  });

  const facialLines = row.facialSnapshots.map(
    (s) =>
      `[${s.timestamp.toISOString()} Q${s.questionNumber}] conf=${s.confidence}/10 stress=${s.stress}/10 engagement=${s.engagement}/10 emotion=${s.primaryEmotion} eyes=${s.eyeContact} posture=${s.posture} — ${s.overallImpression}`,
  );

  const prompt =
    `You are a senior HR specialist and behavioral psychologist.\n` +
    `Generate a comprehensive interview report as ONE JSON object (no markdown).\n\n` +
    `Candidate: ${row.user.name ?? row.user.email}\n` +
    `Role: ${jobTitle}\n` +
    `Interview date: ${row.completedAt?.toISOString() ?? new Date().toISOString()}\n` +
    `Scores already computed: overall=${row.overallScore ?? "n/a"} comm=${row.communicationScore ?? "n/a"} confidence=${row.confidenceScore ?? "n/a"}\n\n` +
    `QUESTIONS AND ANSWERS:\n${qaLines.join("\n\n")}\n\n` +
    `ASSESSMENT: ${assessmentScores ? JSON.stringify(assessmentScores) : "Not available"}\n\n` +
    `FACIAL SNAPSHOTS (${row.facialSnapshots.length}):\n${facialLines.join("\n") || "No facial data"}\n` +
    (facialSummary ? `\nFacial averages: ${JSON.stringify(facialSummary)}\n` : "") +
    `\nReturn JSON matching this structure with bilingual EN/AR fields:\n` +
    `{"executiveSummary":{"overallRating":1-10,"hiringRecommendation":"STRONGLY_RECOMMEND|RECOMMEND|NEUTRAL|NOT_RECOMMEND|STRONGLY_NOT_RECOMMEND","summaryEN":"","summaryAR":""},` +
    `"communicationAnalysis":{"score":1-10,"clarity":1-10,"articulation":1-10,"vocabulary":1-10,"responseRelevance":1-10,"strengths":[],"weaknesses":[],"detailEN":"","detailAR":""},` +
    `"contentAnalysis":{"score":1-10,"relevanceToRole":1-10,"examplesQuality":1-10,"problemSolvingShown":1-10,"industryKnowledge":1-10,"keyInsights":[],"redFlags":[],"detailEN":"","detailAR":""},` +
    `"behavioralAnalysis":{"score":1-10,"leadershipPotential":1-10,"teamworkOrientation":1-10,"problemSolvingApproach":1-10,"adaptability":1-10,"motivationLevel":1-10,"culturalFit":1-10,"behavioralPatterns":[],"detailEN":"","detailAR":""},` +
    `"facialExpressionAnalysis":{"overallConfidenceScore":1-10,"averageStressLevel":1-10,"engagementLevel":1-10,"authenticityScore":1-10,"emotionTimeline":[{"phase":"Opening","dominantEmotion":"","interpretation":""},{"phase":"Mid-Interview","dominantEmotion":"","interpretation":""},{"phase":"Closing","dominantEmotion":"","interpretation":""}],"eyeContactAssessment":"","postureAssessment":"","notableObservations":[],"facialSummaryEN":"","facialSummaryAR":""},` +
    `"questionByQuestionAnalysis":[{"questionNumber":1,"questionText":"","answerQuality":1-10,"keyPoints":[],"missedOpportunities":[],"facialDuringAnswer":"","feedbackEN":"","feedbackAR":""}],` +
    `"strengthsAndWeaknesses":{"topStrengths":[{"strength":"","evidence":"","relevanceToRole":1-10}],"developmentAreas":[{"area":"","observation":"","recommendation":""}]},` +
    `"roleCompatibility":{"technicalFit":1-10,"culturalFit":1-10,"experienceFit":1-10,"motivationFit":1-10,"overallFit":1-10,"fitExplanationEN":"","fitExplanationAR":""},` +
    `"hiringManagerNotes":{"suggestedFollowUpQuestions":[],"areasToExploreMore":[],"onboardingConsiderations":[],"salaryBenchmark":"","finalRecommendationEN":"","finalRecommendationAR":""}}`;

  const claude = await fetchClaudeJsonText({
    system: "Output one valid JSON object only. Be evidence-based and professional.",
    user: prompt,
    maxTokens: 12000,
  });

  if (!claude.ok) return null;

  let report: EnhancedInterviewReport;
  try {
    const json = parseJsonFromModel(claude.text);
    const validated = enhancedInterviewReportSchema.safeParse(json);
    if (!validated.success) return null;
    report = validated.data;
  } catch {
    return null;
  }

  await prisma.videoInterview.update({
    where: { id: interviewId },
    data: {
      enhancedReport: report as object,
      facialAnalysisSummary: (facialSummary ?? { snapshotCount: 0 }) as object,
    },
  });

  return report;
}
