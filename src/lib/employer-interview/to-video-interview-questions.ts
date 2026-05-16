import type { InterviewQuestion } from "./template";

/** Shape stored on `VideoInterview.questions` (aligned with interview generate-questions API). */
export function employerInterviewQuestionsToVideoJson(
  questions: InterviewQuestion[],
): Array<{ id: string; question: string; questionAr: string; category: string; timeLimit: number; tips: string }> {
  return questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    questionAr: (q.promptAr?.trim() ? q.promptAr : q.prompt).trim(),
    category: q.type,
    timeLimit: q.timeLimitSec,
    tips:
      q.type === "multiple_choice" && q.options?.length ? `Choose one: ${q.options.join(" · ")}` : "",
  }));
}
