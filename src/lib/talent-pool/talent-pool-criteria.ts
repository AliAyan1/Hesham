import { ASSESSMENT_PASS_SCORE, ASSESSMENT_STEP_COUNT } from "@/lib/assessment/steps";

export const TALENT_POOL_PROFILE_TARGET = 80;
export const TALENT_POOL_ATS_TARGET = 70;
export const TALENT_POOL_INVITE_DAYS = 7;

export type TalentPoolMetrics = {
  assessmentScore: number | null;
  assessmentComplete: boolean;
  stepsCompleted: number;
  profileCompletion: number;
  atsScore: number | null;
};

export function meetsTalentPoolExitCriteria(metrics: TalentPoolMetrics): boolean {
  return (
    metrics.assessmentComplete &&
    (metrics.assessmentScore ?? 0) >= ASSESSMENT_PASS_SCORE &&
    metrics.stepsCompleted >= ASSESSMENT_STEP_COUNT &&
    metrics.profileCompletion >= TALENT_POOL_PROFILE_TARGET &&
    (metrics.atsScore ?? 0) >= TALENT_POOL_ATS_TARGET
  );
}

export type TalentPoolProgressItemId =
  | "assessmentScore"
  | "assessmentSteps"
  | "profileCompletion"
  | "atsScore";

export type TalentPoolProgressItem = {
  id: TalentPoolProgressItemId;
  done: boolean;
  currentValue: string;
  progressFraction: number;
};

export type TalentPoolProgress = {
  readyPercent: number;
  items: TalentPoolProgressItem[];
};

export function buildTalentPoolProgress(metrics: TalentPoolMetrics): TalentPoolProgress {
  const scoreDone =
    metrics.assessmentComplete && (metrics.assessmentScore ?? 0) >= ASSESSMENT_PASS_SCORE;
  const stepsDone = metrics.stepsCompleted >= ASSESSMENT_STEP_COUNT;
  const profileDone = metrics.profileCompletion >= TALENT_POOL_PROFILE_TARGET;
  const atsDone = (metrics.atsScore ?? 0) >= TALENT_POOL_ATS_TARGET;

  const items: TalentPoolProgressItem[] = [
    {
      id: "assessmentScore",
      done: scoreDone,
      currentValue:
        metrics.assessmentScore != null ? `${metrics.assessmentScore}/100` : "—",
      progressFraction: scoreDone
        ? 1
        : metrics.assessmentScore != null
          ? Math.min(1, metrics.assessmentScore / ASSESSMENT_PASS_SCORE)
          : 0,
    },
    {
      id: "assessmentSteps",
      done: stepsDone,
      currentValue: `${Math.min(metrics.stepsCompleted, ASSESSMENT_STEP_COUNT)}/${ASSESSMENT_STEP_COUNT}`,
      progressFraction: Math.min(1, metrics.stepsCompleted / ASSESSMENT_STEP_COUNT),
    },
    {
      id: "profileCompletion",
      done: profileDone,
      currentValue: `${metrics.profileCompletion}%`,
      progressFraction: Math.min(1, metrics.profileCompletion / TALENT_POOL_PROFILE_TARGET),
    },
    {
      id: "atsScore",
      done: atsDone,
      currentValue: metrics.atsScore != null ? `${metrics.atsScore}/100` : "—",
      progressFraction: atsDone
        ? 1
        : metrics.atsScore != null
          ? Math.min(1, metrics.atsScore / TALENT_POOL_ATS_TARGET)
          : 0,
    },
  ];

  const readyPercent = Math.round(
    (items.reduce((sum, i) => sum + i.progressFraction, 0) / items.length) * 100,
  );

  return { readyPercent, items };
}
