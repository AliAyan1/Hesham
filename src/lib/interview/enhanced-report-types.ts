import { z } from "zod";

export const hiringRecommendationSchema = z.enum([
  "STRONGLY_RECOMMEND",
  "RECOMMEND",
  "NEUTRAL",
  "NOT_RECOMMEND",
  "STRONGLY_NOT_RECOMMEND",
]);

export type HiringRecommendation = z.infer<typeof hiringRecommendationSchema>;

const scoreBlockSchema = z.object({
  score: z.number().min(1).max(10),
  clarity: z.number().min(1).max(10).optional(),
  articulation: z.number().min(1).max(10).optional(),
  vocabulary: z.number().min(1).max(10).optional(),
  responseRelevance: z.number().min(1).max(10).optional(),
  relevanceToRole: z.number().min(1).max(10).optional(),
  examplesQuality: z.number().min(1).max(10).optional(),
  problemSolvingShown: z.number().min(1).max(10).optional(),
  industryKnowledge: z.number().min(1).max(10).optional(),
  leadershipPotential: z.number().min(1).max(10).optional(),
  teamworkOrientation: z.number().min(1).max(10).optional(),
  problemSolvingApproach: z.number().min(1).max(10).optional(),
  adaptability: z.number().min(1).max(10).optional(),
  motivationLevel: z.number().min(1).max(10).optional(),
  culturalFit: z.number().min(1).max(10).optional(),
  strengths: z.array(z.string()).max(8).optional(),
  weaknesses: z.array(z.string()).max(8).optional(),
  keyInsights: z.array(z.string()).max(8).optional(),
  redFlags: z.array(z.string()).max(8).optional(),
  behavioralPatterns: z.array(z.string()).max(8).optional(),
  detailEN: z.string(),
  detailAR: z.string(),
});

export const enhancedInterviewReportSchema = z.object({
  executiveSummary: z.object({
    overallRating: z.number().min(1).max(10),
    hiringRecommendation: hiringRecommendationSchema,
    summaryEN: z.string(),
    summaryAR: z.string(),
  }),
  communicationAnalysis: scoreBlockSchema,
  contentAnalysis: scoreBlockSchema,
  behavioralAnalysis: scoreBlockSchema,
  facialExpressionAnalysis: z.object({
    overallConfidenceScore: z.number().min(1).max(10),
    averageStressLevel: z.number().min(1).max(10),
    engagementLevel: z.number().min(1).max(10),
    authenticityScore: z.number().min(1).max(10),
    emotionTimeline: z
      .array(
        z.object({
          phase: z.string(),
          dominantEmotion: z.string(),
          interpretation: z.string(),
        }),
      )
      .min(1)
      .max(5),
    eyeContactAssessment: z.string(),
    postureAssessment: z.string(),
    notableObservations: z.array(z.string()).max(6),
    facialSummaryEN: z.string(),
    facialSummaryAR: z.string(),
  }),
  questionByQuestionAnalysis: z
    .array(
      z.object({
        questionNumber: z.number().int().min(1),
        questionText: z.string(),
        answerQuality: z.number().min(1).max(10),
        keyPoints: z.array(z.string()).max(8),
        missedOpportunities: z.array(z.string()).max(8),
        facialDuringAnswer: z.string(),
        feedbackEN: z.string(),
        feedbackAR: z.string(),
      }),
    )
    .min(1)
    .max(20),
  strengthsAndWeaknesses: z.object({
    topStrengths: z
      .array(
        z.object({
          strength: z.string(),
          evidence: z.string(),
          relevanceToRole: z.number().min(1).max(10),
        }),
      )
      .max(5),
    developmentAreas: z
      .array(
        z.object({
          area: z.string(),
          observation: z.string(),
          recommendation: z.string(),
        }),
      )
      .max(5),
  }),
  roleCompatibility: z.object({
    technicalFit: z.number().min(1).max(10),
    culturalFit: z.number().min(1).max(10),
    experienceFit: z.number().min(1).max(10),
    motivationFit: z.number().min(1).max(10),
    overallFit: z.number().min(1).max(10),
    fitExplanationEN: z.string(),
    fitExplanationAR: z.string(),
  }),
  hiringManagerNotes: z.object({
    suggestedFollowUpQuestions: z.array(z.string()).max(6),
    areasToExploreMore: z.array(z.string()).max(6),
    onboardingConsiderations: z.array(z.string()).max(6),
    salaryBenchmark: z.string(),
    finalRecommendationEN: z.string(),
    finalRecommendationAR: z.string(),
  }),
});

export type EnhancedInterviewReport = z.infer<typeof enhancedInterviewReportSchema>;

export type CandidateInterviewReportView = {
  overallScore: number;
  communicationScore: number;
  contentScore: number;
  behavioralScore: number;
  bodyLanguageLabel: "Good" | "Fair" | "Needs Work";
  communicationFeedbackEN: string;
  communicationFeedbackAR: string;
  contentFeedbackEN: string;
  contentFeedbackAR: string;
  improvements: Array<{ title: string; tip: string; titleAr: string; tipAr: string }>;
  generatedAt: string | null;
};
