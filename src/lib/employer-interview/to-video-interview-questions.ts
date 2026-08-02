import type { InterviewQuestion } from "./template";

/** Shape stored on `VideoInterview.questions` (aligned with interview generate-questions API). */
export type VideoInterviewQuestionJson = {
  id: string;
  question: string;
  questionAr: string;
  category: string;
  timeLimit: number;
  tips: string;
  /** Contingent probe Lara may ask after the candidate answers. */
  followUp?: string;
  followUpAr?: string;
  stage?: string;
};

export function employerInterviewQuestionsToVideoJson(
  questions: InterviewQuestion[],
): VideoInterviewQuestionJson[] {
  return questions.map((q) => {
    const tipsParts: string[] = [];
    if (q.type === "multiple_choice" && q.options?.length) {
      tipsParts.push(`Choose one: ${q.options.join(" · ")}`);
    }
    if (q.stage) tipsParts.push(`Stage: ${q.stage}`);

    return {
      id: q.id,
      question: q.prompt,
      questionAr: (q.promptAr?.trim() ? q.promptAr : q.prompt).trim(),
      category: q.stage ?? q.type,
      timeLimit: q.timeLimitSec,
      tips: tipsParts.join(" · "),
      ...(q.followUpPrompt?.trim()
        ? {
            followUp: q.followUpPrompt.trim(),
            followUpAr: (q.followUpPromptAr?.trim() ? q.followUpPromptAr : q.followUpPrompt).trim(),
          }
        : {}),
      ...(q.stage ? { stage: q.stage } : {}),
    };
  });
}
