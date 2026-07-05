import type { FacialAnalysisSummary } from "@/lib/interview/facial-analysis-types";

type SnapshotRow = {
  confidence: number;
  stress: number;
  engagement: number;
  authenticity: number;
  primaryEmotion: string;
  eyeContact: string;
  posture: string;
};

export function computeFacialAnalysisSummary(snapshots: SnapshotRow[]): FacialAnalysisSummary | null {
  if (!snapshots.length) return null;

  const n = snapshots.length;
  const sum = snapshots.reduce(
    (acc, s) => ({
      confidence: acc.confidence + s.confidence,
      stress: acc.stress + s.stress,
      engagement: acc.engagement + s.engagement,
      authenticity: acc.authenticity + s.authenticity,
    }),
    { confidence: 0, stress: 0, engagement: 0, authenticity: 0 },
  );

  const emotionCounts = new Map<string, number>();
  const eyeCounts = new Map<string, number>();
  const postureCounts = new Map<string, number>();
  for (const s of snapshots) {
    emotionCounts.set(s.primaryEmotion, (emotionCounts.get(s.primaryEmotion) ?? 0) + 1);
    eyeCounts.set(s.eyeContact, (eyeCounts.get(s.eyeContact) ?? 0) + 1);
    postureCounts.set(s.posture, (postureCounts.get(s.posture) ?? 0) + 1);
  }

  const dominant = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

  return {
    snapshotCount: n,
    averageConfidence: Math.round((sum.confidence / n) * 10) / 10,
    averageStress: Math.round((sum.stress / n) * 10) / 10,
    averageEngagement: Math.round((sum.engagement / n) * 10) / 10,
    averageAuthenticity: Math.round((sum.authenticity / n) * 10) / 10,
    dominantEmotion: dominant(emotionCounts),
    eyeContactTrend: dominant(eyeCounts),
    postureTrend: dominant(postureCounts),
  };
}
