import { enhancedInterviewReportSchema } from "@/lib/interview/enhanced-report-types";

export function extractShortlistInsightsFromReport(enhancedReport: unknown): {
  hiringRecommendation: string | null;
  commScore: number | null;
  contentScore: number | null;
  facialScore: number | null;
  fitScore: number | null;
  redFlag: string | null;
} {
  const parsed = enhancedInterviewReportSchema.safeParse(enhancedReport);
  if (!parsed.success) {
    return {
      hiringRecommendation: null,
      commScore: null,
      contentScore: null,
      facialScore: null,
      fitScore: null,
      redFlag: null,
    };
  }
  const r = parsed.data;
  const redFlag = r.contentAnalysis.redFlags?.[0] ?? null;
  return {
    hiringRecommendation: r.executiveSummary.hiringRecommendation,
    commScore: r.communicationAnalysis.score,
    contentScore: r.contentAnalysis.score,
    facialScore: r.facialExpressionAnalysis.overallConfidenceScore,
    fitScore: r.roleCompatibility.overallFit,
    redFlag,
  };
}
