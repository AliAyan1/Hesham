import { z } from "zod";

export const facialSnapshotSchema = z.object({
  timestamp: z.string(),
  questionNumber: z.number().int().min(0),
  confidence: z.number().min(1).max(10),
  stress: z.number().min(1).max(10),
  engagement: z.number().min(1).max(10),
  authenticity: z.number().min(1).max(10),
  primaryEmotion: z.string(),
  eyeContact: z.string(),
  posture: z.string(),
  microExpressions: z.array(z.string()).max(5),
  overallImpression: z.string(),
});

export type FacialSnapshot = z.infer<typeof facialSnapshotSchema>;

export const facialAnalysisApiSchema = z.object({
  imageBase64: z.string().min(32).max(2_000_000),
  interviewId: z.string().min(1),
  timestamp: z.string(),
  questionNumber: z.number().int().min(0).max(50),
});

export type FacialAnalysisSummary = {
  snapshotCount: number;
  averageConfidence: number;
  averageStress: number;
  averageEngagement: number;
  averageAuthenticity: number;
  dominantEmotion: string;
  eyeContactTrend: string;
  postureTrend: string;
};
