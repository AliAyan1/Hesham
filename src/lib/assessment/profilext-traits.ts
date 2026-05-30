import type {
  BehavioralTraitId,
  InterestId,
  ThinkingTraitId,
  TraitId,
} from "@/lib/assessment/profilext-types";

export const THINKING_TRAITS: ThinkingTraitId[] = [
  "learningIndicator",
  "verbalSkill",
  "verbalReasoning",
  "numericalAbility",
  "numericalReasoning",
];

export const BEHAVIORAL_TRAITS: BehavioralTraitId[] = [
  "energyLevel",
  "assertiveness",
  "sociability",
  "compliance",
  "attitude",
  "decisiveness",
  "accommodation",
  "independence",
  "objectiveJudgment",
];

export const INTEREST_AREAS: InterestId[] = [
  "leadership",
  "financial",
  "peopleService",
  "technical",
  "mechanical",
  "creativity",
];

export const ALL_TRAITS: TraitId[] = [...THINKING_TRAITS, ...BEHAVIORAL_TRAITS, ...INTEREST_AREAS];

/** Questions per trait per step */
export const STEP_TRAIT_COUNTS: Record<number, Partial<Record<TraitId, number>>> = {
  1: {
    learningIndicator: 10,
    numericalAbility: 10,
    numericalReasoning: 8,
  },
  2: {
    verbalSkill: 10,
    verbalReasoning: 8,
  },
  3: {
    energyLevel: 4,
    assertiveness: 4,
    sociability: 4,
    compliance: 4,
    attitude: 4,
    decisiveness: 4,
    accommodation: 4,
    independence: 4,
    objectiveJudgment: 4,
  },
  4: {
    leadership: 8,
    financial: 8,
    peopleService: 8,
    technical: 8,
    mechanical: 8,
    creativity: 8,
  },
  5: {
    energyLevel: 4,
    assertiveness: 4,
    sociability: 4,
    compliance: 4,
    attitude: 4,
    decisiveness: 4,
    accommodation: 4,
    independence: 4,
    objectiveJudgment: 4,
  },
};

export function traitsForStep(step: number): Array<{ trait: TraitId; count: number }> {
  const map = STEP_TRAIT_COUNTS[step] ?? {};
  return Object.entries(map).map(([trait, count]) => ({
    trait: trait as TraitId,
    count: count ?? 0,
  }));
}

export function questionCountForStep(step: number): number {
  return traitsForStep(step).reduce((sum, t) => sum + t.count, 0);
}

export function isThinkingTrait(trait: TraitId): trait is ThinkingTraitId {
  return (THINKING_TRAITS as string[]).includes(trait);
}

export function isBehavioralTrait(trait: TraitId): trait is BehavioralTraitId {
  return (BEHAVIORAL_TRAITS as string[]).includes(trait);
}

export function isInterestTrait(trait: TraitId): trait is InterestId {
  return (INTEREST_AREAS as string[]).includes(trait);
}

export const TRAIT_LABELS: Record<TraitId, { en: string; ar: string }> = {
  learningIndicator: { en: "Learning Indicator", ar: "مؤشر التعلم" },
  verbalSkill: { en: "Verbal Skill", ar: "المهارة الشفهية" },
  verbalReasoning: { en: "Verbal Reasoning", ar: "الاستنتاج الشفهي" },
  numericalAbility: { en: "Numerical Ability", ar: "القدرة العددية" },
  numericalReasoning: { en: "Numerical Reasoning", ar: "الاستنتاج العددي" },
  energyLevel: { en: "Energy Level", ar: "مستوى الطاقة" },
  assertiveness: { en: "Assertiveness", ar: "الحزم والإصرار" },
  sociability: { en: "Sociability", ar: "المخالطة" },
  compliance: { en: "Compliance", ar: "الانقياد" },
  attitude: { en: "Attitude", ar: "الموقف" },
  decisiveness: { en: "Decisiveness", ar: "الحسم في القرار" },
  accommodation: { en: "Accommodation", ar: "المراعاة والاعتبار" },
  independence: { en: "Independence", ar: "الاستقلالية" },
  objectiveJudgment: { en: "Objective Judgment", ar: "الحكم الموضوعي" },
  leadership: { en: "Leadership / Enterprise", ar: "الريادة" },
  financial: { en: "Financial / Administrative", ar: "المالية/الإدارية" },
  peopleService: { en: "People Service", ar: "خدمة الناس" },
  technical: { en: "Technical", ar: "التقنية" },
  mechanical: { en: "Mechanical", ar: "الميكانيكية" },
  creativity: { en: "Creativity", ar: "الإبداع" },
};
