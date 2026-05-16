/** Five-step general AI assessment (free for all users). */

export const ASSESSMENT_STEP_COUNT = 5;
export const ASSESSMENT_PASS_SCORE = 50;

export type AssessmentStepId = 1 | 2 | 3 | 4 | 5;

export type StepConfig = {
  id: AssessmentStepId;
  slug: string;
  questionCount: number;
  stepTimeLimitSec: number;
  dominantTypes: Array<"multiple_choice" | "text" | "rating" | "scenario">;
  category: "skills" | "communication" | "behavioral" | "industry";
  promptFocus: string;
};

export const ASSESSMENT_STEPS: StepConfig[] = [
  {
    id: 1,
    slug: "1",
    questionCount: 15,
    stepTimeLimitSec: 15 * 60,
    dominantTypes: ["multiple_choice"],
    category: "skills",
    promptFocus: "General knowledge, logic, basic math, patterns — no field knowledge.",
  },
  {
    id: 2,
    slug: "2",
    questionCount: 10,
    stepTimeLimitSec: 15 * 60,
    dominantTypes: ["text", "multiple_choice"],
    category: "communication",
    promptFocus: "Professional communication: emails, clarity, rewriting — universal scenarios.",
  },
  {
    id: 3,
    slug: "3",
    questionCount: 15,
    stepTimeLimitSec: 10 * 60,
    dominantTypes: ["multiple_choice"],
    category: "behavioral",
    promptFocus: "Workplace behavior MCQ scenarios — conflict, priorities, teamwork.",
  },
  {
    id: 4,
    slug: "4",
    questionCount: 15,
    stepTimeLimitSec: 15 * 60,
    dominantTypes: ["multiple_choice"],
    category: "skills",
    promptFocus: "Generic professional competencies — NOT industry or job-specific.",
  },
  {
    id: 5,
    slug: "5",
    questionCount: 10,
    stepTimeLimitSec: 10 * 60,
    dominantTypes: ["multiple_choice"],
    category: "behavioral",
    promptFocus: "Emotional intelligence MCQ — empathy, stress, reactions, collaboration.",
  },
];

export function stepConfig(step: number): StepConfig | null {
  return ASSESSMENT_STEPS.find((s) => s.id === step) ?? null;
}

export function isValidStep(step: number): step is AssessmentStepId {
  return step >= 1 && step <= ASSESSMENT_STEP_COUNT;
}

export function stepKey(step: number): `step${1 | 2 | 3 | 4 | 5}` {
  return `step${step}` as `step${1 | 2 | 3 | 4 | 5}`;
}
