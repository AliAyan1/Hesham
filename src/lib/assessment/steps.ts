/** ProfileXT five-step psychometric assessment */

export const ASSESSMENT_STEP_COUNT = 5;
export const ASSESSMENT_PASS_SCORE = 50;

export type AssessmentStepId = 1 | 2 | 3 | 4 | 5;

export type StepConfig = {
  id: AssessmentStepId;
  slug: string;
  questionCount: number;
  stepTimeLimitSec: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: "thinking" | "communication" | "behavioral" | "interests" | "situational";
};

import { questionCountForStep } from "@/lib/assessment/profilext-traits";

export const ASSESSMENT_STEPS: StepConfig[] = [
  {
    id: 1,
    slug: "1",
    questionCount: questionCountForStep(1),
    stepTimeLimitSec: 30 * 60,
    titleEn: "Thinking & Learning",
    titleAr: "التفكير والتعلم",
    descriptionEn: "Cognitive abilities, logical sequences, and numerical reasoning",
    descriptionAr: "القدرات المعرفية والتسلسلات المنطقية والاستنتاج العددي",
    category: "thinking",
  },
  {
    id: 2,
    slug: "2",
    questionCount: questionCountForStep(2),
    stepTimeLimitSec: 20 * 60,
    titleEn: "Communication Skills",
    titleAr: "مهارات التواصل",
    descriptionEn: "Verbal skill and verbal reasoning",
    descriptionAr: "المهارة الشفهية والاستنتاج اللفظي",
    category: "communication",
  },
  {
    id: 3,
    slug: "3",
    questionCount: questionCountForStep(3),
    stepTimeLimitSec: 25 * 60,
    titleEn: "Behavioral Profile",
    titleAr: "الملف السلوكي",
    descriptionEn: "Work style and personality traits (self-report)",
    descriptionAr: "أسلوب العمل وسمات الشخصية (تقييم ذاتي)",
    category: "behavioral",
  },
  {
    id: 4,
    slug: "4",
    questionCount: questionCountForStep(4),
    stepTimeLimitSec: 15 * 60,
    titleEn: "Professional Interests",
    titleAr: "الاهتمامات المهنية",
    descriptionEn: "Career preferences and motivations",
    descriptionAr: "التفضيلات المهنية والدوافع",
    category: "interests",
  },
  {
    id: 5,
    slug: "5",
    questionCount: questionCountForStep(5),
    stepTimeLimitSec: 20 * 60,
    titleEn: "Situational Judgment",
    titleAr: "الحكم في المواقف",
    descriptionEn: "Decision-making scenarios and behavioral depth",
    descriptionAr: "سيناريوهات اتخاذ القرار وعمق السلوك",
    category: "situational",
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
