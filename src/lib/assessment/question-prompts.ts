import type { StepConfig } from "@/lib/assessment/steps";

const UNIVERSAL_RULES = `
UNIVERSAL RULES (apply to every question):
- ANY professional from ANY industry must be able to answer — fresh graduate AND 20-year manager.
- NO field-specific knowledge (no coding, medicine, law, finance jargon, tools, or certifications).
- NO industry-specific knowledge required.
- Test thinking and judgment, NOT memorized facts.
- Use universal workplace or everyday professional situations everyone can relate to.
- Language: professional but simple and clear.
- Provide question (English) and questionAr (Arabic) for every item.
- If it requires specific field knowledge → do NOT include it.
`.trim();

const STEP_TITLES: Record<number, string> = {
  1: "General Knowledge & Intelligence",
  2: "Communication",
  3: "Behavioral",
  4: "Professional Skills",
  5: "Emotional Intelligence",
};

const STEP_INSTRUCTIONS: Record<number, string> = {
  1: `
STEP 1 — General Knowledge & Intelligence
Type: multiple_choice only (exactly 4 options per question).
Count: 15 questions. Difficulty: mixed (easy to hard).
No field-specific knowledge. Logic, basic math, patterns, critical thinking.

Good examples (style only — write NEW questions):
- "If a project has 5 tasks and each takes 3 days, but 2 can run simultaneously, minimum days to complete?" → 9 days (not 15).
- "Which word does NOT belong?" → Manage / Lead / Delegate / Confuse.
- "A team finishes 40% of work in 2 days. At this rate, how many more days to finish?" → 3 days.
`.trim(),

  2: `
STEP 2 — Communication
Mix: about 4 text (written answer) + about 6 multiple_choice (4 options each). Total: 10 questions.
Universal professional scenarios — not industry-specific.

Good examples (style only):
- TEXT: Write a professional email declining a meeting while keeping the relationship positive.
- MCQ: Your manager sends unclear instructions. What do you do? → Ask for clarification politely.
- TEXT: Rewrite professionally: "I dont know when ill finish it"
`.trim(),

  3: `
STEP 3 — Behavioral
Type: multiple_choice (4 options). Present as "What do you do?" workplace scenarios. Total: 15 questions.
Universal workplace behavior — not industry-specific.

Good examples (style only):
- A colleague takes credit for your work in a meeting → Speak to them privately after.
- You have 3 urgent tasks due today → Assess impact and deadline of each.
- A team member is consistently late affecting your work → Have a direct conversation with them first.
`.trim(),

  4: `
STEP 4 — Professional Skills
Type: multiple_choice only (4 options). Total: 15 questions.
GENERIC professional competencies — NOT field-specific, NOT based on job title or industry from profile.

Good examples (style only):
- Most important element of a professional presentation → Clear message and structure.
- When setting a project deadline you should → Add buffer time for unexpected delays.
- A client complains about your service. Best first response → Acknowledge and apologize.
`.trim(),

  5: `
STEP 5 — Emotional Intelligence
Type: multiple_choice (4 options). "What do you do?" human/team scenarios. Total: 10 questions.
Empathy, stress, reactions, conflict — universal, not field-specific.

Good examples (style only):
- A colleague seems stressed and making mistakes → Check in and offer support.
- You receive harsh criticism on your work → Take time to reflect before responding.
- Your team disagrees on an approach; you believe you are right → Listen to all views then find middle ground.
`.trim(),
};

export function assessmentStepTitle(step: number): string {
  return STEP_TITLES[step] ?? `Step ${step}`;
}

export function buildAssessmentQuestionPrompt(
  step: number,
  cfg: StepConfig,
  opts: { retake: boolean },
): { system: string; user: string } {
  const stepTitle = STEP_TITLES[step] ?? `Step ${step}`;
  const stepBlock = STEP_INSTRUCTIONS[step] ?? cfg.promptFocus;

  const typeHint =
    cfg.dominantTypes.length === 1
      ? cfg.dominantTypes[0]
      : cfg.dominantTypes.join(" and ");

  const retakeNote = opts.retake
    ? "\n\nRETAKE: Generate completely NEW questions. Do not reuse or paraphrase the example stems above."
    : "";

  const user = `
Generate assessment questions that ANY professional from ANY industry can answer.

${UNIVERSAL_RULES}

---
${stepBlock}
---

Step name: ${stepTitle}
Primary JSON "type" values to use: ${typeHint}
JSON "category" field: "${cfg.category}"
Exact question count: ${cfg.questionCount}
${retakeNote}

Return ONLY this JSON (no markdown):
{"questions":[{"id":"unique_id","type":"multiple_choice"|"text"|"scenario","category":"${cfg.category}","question":"English","questionAr":"Arabic","options":["A","B","C","D"]|null,"optionsAr":["..."]|null,"correctAnswer":"best option letter or key phrase|null for text","timeLimit":60}]}

Rules for JSON:
- MCQ: exactly 4 options in options and optionsAr; type multiple_choice.
- Written answers: type text; options and optionsAr must be null.
- timeLimit: 60–120 seconds per question.
- correctAnswer: for MCQ the best option text or letter; for text null or brief rubric phrase.
`.trim();

  const system = `
You are an expert occupational psychologist designing fair hiring assessments.
You output a single JSON object only. Plain UTF-8. No markdown fences.
Every question must pass: "Can a fresh graduate AND a senior manager both answer without specialist knowledge?"
If no → replace the question.
`.trim();

  return { system, user };
}
