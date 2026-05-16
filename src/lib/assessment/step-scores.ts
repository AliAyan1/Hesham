import { ASSESSMENT_PASS_SCORE, ASSESSMENT_STEP_COUNT, stepKey } from "@/lib/assessment/steps";

export { stepKey };

export type StepScoreEntry = {
  score: number;
  completedAt: string;
  strengths?: unknown[];
  weaknesses?: unknown[];
};

export type StepScoresMap = Partial<
  Record<"step1" | "step2" | "step3" | "step4" | "step5", StepScoreEntry>
>;

export function parseStepScores(raw: unknown): StepScoresMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: StepScoresMap = {};
  for (let i = 1; i <= ASSESSMENT_STEP_COUNT; i++) {
    const k = stepKey(i);
    const v = o[k];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const e = v as Record<string, unknown>;
    const score = typeof e.score === "number" ? e.score : null;
    const completedAt = typeof e.completedAt === "string" ? e.completedAt : null;
    if (score == null || completedAt == null) continue;
    out[k] = {
      score: Math.round(Math.min(100, Math.max(0, score))),
      completedAt,
      strengths: Array.isArray(e.strengths) ? e.strengths : undefined,
      weaknesses: Array.isArray(e.weaknesses) ? e.weaknesses : undefined,
    };
  }
  return out;
}

export function countCompletedSteps(scores: StepScoresMap): number {
  let n = 0;
  for (let i = 1; i <= ASSESSMENT_STEP_COUNT; i++) {
    if (scores[stepKey(i)]) n++;
  }
  return n;
}

export function computeOverallFromSteps(scores: StepScoresMap): number | null {
  const vals: number[] = [];
  for (let i = 1; i <= ASSESSMENT_STEP_COUNT; i++) {
    const e = scores[stepKey(i)];
    if (e) vals.push(e.score);
  }
  if (vals.length !== ASSESSMENT_STEP_COUNT) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function stepStatus(
  scores: StepScoresMap,
  step: number,
  currentStep: number | null,
): "completed" | "in_progress" | "not_started" {
  if (scores[stepKey(step)]) return "completed";
  if (currentStep === step) return "in_progress";
  return "not_started";
}

export function canStartStep(
  scores: StepScoresMap,
  step: number,
  opts: { forceRetake?: boolean; overallScore?: number | null },
): boolean {
  const entry = scores[stepKey(step)];
  if (!entry) return true;
  if (opts.forceRetake) return true;
  if (entry.score < ASSESSMENT_PASS_SCORE) return true;
  const overall = opts.overallScore ?? computeOverallFromSteps(scores);
  if (overall != null && overall < ASSESSMENT_PASS_SCORE && entry.score < ASSESSMENT_PASS_SCORE) {
    return true;
  }
  return false;
}

export function failedSteps(scores: StepScoresMap): number[] {
  const failed: number[] = [];
  for (let i = 1; i <= ASSESSMENT_STEP_COUNT; i++) {
    const e = scores[stepKey(i)];
    if (e && e.score < ASSESSMENT_PASS_SCORE) failed.push(i);
  }
  return failed;
}
