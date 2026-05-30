import {
  BEHAVIORAL_TRAITS,
  INTEREST_AREAS,
  THINKING_TRAITS,
  isBehavioralTrait,
  isInterestTrait,
  isThinkingTrait,
} from "@/lib/assessment/profilext-traits";
import type {
  InterestScoresMap,
  ProfileXtAnswer,
  ProfileXtQuestion,
  TraitScoresMap,
  InterestId,
} from "@/lib/assessment/profilext-types";

/** Map cognitive percent correct to 1–10 scale */
export function cognitivePercentToScore(percentCorrect: number): number {
  if (percentCorrect <= 20) return Math.max(1, Math.round(percentCorrect / 10) || 1);
  if (percentCorrect <= 40) return 3 + Math.round(((percentCorrect - 21) / 19) * 1);
  if (percentCorrect <= 60) return 5 + Math.round(((percentCorrect - 41) / 19) * 1);
  if (percentCorrect <= 80) return 7 + Math.round(((percentCorrect - 61) / 19) * 1);
  return 9 + Math.round(((percentCorrect - 81) / 19) * 1);
}

/** Map Likert average (1–5) to 1–10 scale */
export function likertAverageToScore(avg: number): number {
  const clamped = Math.max(1, Math.min(5, avg));
  return Math.max(1, Math.min(10, Math.round(clamped * 2)));
}

function normalizeAnswer(value: string | number): string {
  return String(value).trim().toLowerCase();
}

function scoreCognitiveTrait(
  questions: ProfileXtQuestion[],
  answers: ProfileXtAnswer[],
): number {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));
  let correct = 0;
  let total = 0;
  for (const q of questions) {
    if (!q.correctAnswer) continue;
    total += 1;
    const given = answerMap.get(q.id);
    if (given == null) continue;
    if (normalizeAnswer(given) === normalizeAnswer(q.correctAnswer)) correct += 1;
  }
  if (total === 0) return 5;
  return cognitivePercentToScore((correct / total) * 100);
}

function scoreLikertTrait(questions: ProfileXtQuestion[], answers: ProfileXtAnswer[]): number {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));
  const values: number[] = [];
  for (const q of questions) {
    const raw = answerMap.get(q.id);
    if (raw == null) continue;
    const num = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    if (!Number.isNaN(num) && num >= 1 && num <= 5) values.push(num);
  }
  if (values.length === 0) return 5;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return likertAverageToScore(avg);
}

export function computeTraitScores(
  questions: ProfileXtQuestion[],
  answers: ProfileXtAnswer[],
): TraitScoresMap {
  const byTrait = new Map<string, ProfileXtQuestion[]>();
  for (const q of questions) {
    const list = byTrait.get(q.trait) ?? [];
    list.push(q);
    byTrait.set(q.trait, list);
  }

  const scores: TraitScoresMap = {};
  for (const [trait, qs] of byTrait) {
    if (isThinkingTrait(trait as never)) {
      scores[trait as keyof TraitScoresMap] = scoreCognitiveTrait(qs, answers);
    } else {
      scores[trait as keyof TraitScoresMap] = scoreLikertTrait(qs, answers);
    }
  }
  return scores;
}

export function mergeTraitScores(
  existing: TraitScoresMap,
  incoming: TraitScoresMap,
): TraitScoresMap {
  const result: TraitScoresMap = { ...existing };
  for (const [trait, score] of Object.entries(incoming)) {
    if (score == null) continue;
    const key = trait as keyof TraitScoresMap;
    const prev = result[key];
    result[key] = prev != null ? Math.round(((prev + score) / 2) * 10) / 10 : score;
  }
  return result;
}

export function computeInterestScores(
  traitScores: TraitScoresMap,
  questions: ProfileXtQuestion[],
  answers: ProfileXtAnswer[],
): InterestScoresMap {
  const interestQs = questions.filter((q) => isInterestTrait(q.trait));
  const byInterest = new Map<string, number[]>();
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));

  for (const q of interestQs) {
    const raw = answerMap.get(q.id);
    if (raw == null) continue;
    const num = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    if (Number.isNaN(num)) continue;
    const list = byInterest.get(q.trait) ?? [];
    list.push(num);
    byInterest.set(q.trait, list);
  }

  const result: InterestScoresMap = {};
  for (const interest of INTEREST_AREAS) {
    const vals = byInterest.get(interest) ?? [];
    result[interest] = vals.length ? vals.reduce((a, b) => a + b, 0) : traitScores[interest] ?? 0;
  }
  return result;
}

function averageTraitGroup(scores: TraitScoresMap, traits: readonly string[]): number {
  const vals = traits.map((t) => scores[t as keyof TraitScoresMap]).filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return (vals.reduce((a, b) => a + b, 0) / vals.length) * 10;
}

export function computeCategoryScores(
  traitScores: TraitScoresMap,
  interestScores: InterestScoresMap,
): {
  thinkingStyleScore: number;
  behavioralScore: number;
  interestsScore: number;
  overallScore: number;
} {
  const thinkingStyleScore = averageTraitGroup(traitScores, THINKING_TRAITS);
  const behavioralScore = averageTraitGroup(traitScores, BEHAVIORAL_TRAITS);

  const interestVals = INTEREST_AREAS.map((i) => interestScores[i] ?? 0);
  const maxInterest = Math.max(...interestVals, 1);
  const interestsScore = Math.round((maxInterest / (8 * 5)) * 100);

  const overallScore = Math.round(
    thinkingStyleScore * 0.4 + behavioralScore * 0.35 + interestsScore * 0.25,
  );

  return {
    thinkingStyleScore: Math.round(thinkingStyleScore),
    behavioralScore: Math.round(behavioralScore),
    interestsScore: Math.min(100, interestsScore),
    overallScore: Math.min(100, overallScore),
  };
}

export function rankedInterests(interestScores: InterestScoresMap): InterestId[] {
  return [...INTEREST_AREAS].sort(
    (a, b) => (interestScores[b] ?? 0) - (interestScores[a] ?? 0),
  );
}
