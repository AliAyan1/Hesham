import { TRAIT_LABELS, traitsForStep } from "@/lib/assessment/profilext-traits";
import type { StepConfig } from "@/lib/assessment/steps";

export function buildProfileXtQuestionPrompt(
  step: number,
  cfg: StepConfig,
  opts: { retake: boolean; candidateName?: string },
): { system: string; user: string } {
  const traitBlocks = traitsForStep(step)
    .map(({ trait, count }) => {
      const label = TRAIT_LABELS[trait];
      return `- ${trait} (${label.en} / ${label.ar}): ${count} questions`;
    })
    .join("\n");

  const isCognitive = step === 1 || step === 2;
  const isBehavioral = step === 3 || step === 5;
  const isInterests = step === 4;

  let typeInstructions = "";
  if (isCognitive) {
    typeInstructions = `
Each question MUST be type "mcq" with exactly 4 options (EN + AR).
Include a definite correctAnswer (exact option text in English).
Topics: logical sequences, analogies, vocabulary, reading comprehension, arithmetic, percentages, data interpretation.
NO duplicate question patterns. Vary difficulty.`;
  } else if (isBehavioral || isInterests) {
    typeInstructions = `
Each question MUST be type "likert" with NO correctAnswer (null).
Use 5-point scale labels in options: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"] and Arabic equivalents.
Questions are situational self-report — NO right or wrong answers.
${step === 5 ? "Include situational workplace scenarios requiring judgment." : ""}`;
  }

  const system = `You are a psychometric test designer trained in ProfileXT methodology.
Generate unique, professional assessment questions in English AND Arabic.
Return ONLY valid JSON: {"questions":[...]}
Each question object:
{
  "id": "unique-id",
  "trait": "traitId",
  "category": "thinking"|"behavioral"|"interests"|"situational",
  "type": "mcq"|"likert",
  "question": "English text",
  "questionAr": "Arabic text",
  "options": ["..."],
  "optionsAr": ["..."],
  "correctAnswer": "exact option or null",
  "timeLimit": 60
}`;

  const user = `Generate EXACTLY ${cfg.questionCount} questions for Step ${step}: ${cfg.titleEn}
${traitBlocks}
${typeInstructions}
${opts.retake ? "This is a RETAKE — generate completely NEW questions, different from typical prior versions." : ""}
Candidate: ${opts.candidateName ?? "Job seeker"}
Return ONLY JSON.`;

  return { system, user };
}

export function assessmentStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: "Thinking & Learning",
    2: "Communication Skills",
    3: "Behavioral Profile",
    4: "Professional Interests",
    5: "Situational Judgment",
  };
  return titles[step] ?? `Step ${step}`;
}
