/** Competency / job AI interview fallbacks when Claude is unavailable or returns invalid JSON. */

export type VideoInterviewQuestion = {
  id: string;
  question: string;
  questionAr: string;
  category: string;
  timeLimit: number;
  tips: string;
  followUp?: string;
  followUpAr?: string;
  stage?: string;
};

function q(
  id: string,
  question: string,
  questionAr: string,
  category: string,
  tips: string,
  timeLimit = 120,
): VideoInterviewQuestion {
  return { id, question, questionAr, category, timeLimit, tips };
}

export function fallbackCompetencyInterviewQuestions(role: string): VideoInterviewQuestion[] {
  const r = role.trim() || "professional";
  return [
    q(
      "comp-1",
      `Tell me about your experience as a ${r} and the impact you typically deliver.`,
      `أخبرني عن خبرتك كـ ${r} والأثر الذي عادة ما تحققه.`,
      "experience",
      "Focus on years, scope, and one outcome.",
    ),
    q(
      "comp-2",
      "Describe a time you solved a complex problem under pressure. What was your approach?",
      "صف موقفاً حللت فيه مشكلة معقدة تحت ضغط. ما كان أسلوبك؟",
      "problem_solving",
      "Use situation → action → result.",
    ),
    q(
      "comp-3",
      "How do you communicate technical or complex ideas to non-experts?",
      "كيف توصل الأفكار التقنية أو المعقدة لغير المتخصصين؟",
      "communication",
      "Give a concrete example.",
    ),
    q(
      "comp-4",
      "Tell me about a collaboration that did not go smoothly and how you handled it.",
      "أخبرني عن تعاون لم يسر بسلاسة وكيف تعاملت معه.",
      "teamwork",
      "Stay professional and solution-focused.",
    ),
    q(
      "comp-5",
      `Why are you interested in growing as a ${r} right now?`,
      `لماذا تهتم بالتطور كـ ${r} في الوقت الحالي؟`,
      "motivation",
      "Connect goals to the role.",
    ),
  ];
}

export function fallbackJobInterviewQuestions(
  role: string,
  jobTitle: string,
): VideoInterviewQuestion[] {
  const title = jobTitle.trim() || role.trim() || "this role";
  return [
    q(
      "job-1",
      `Why do you want this ${title} role, and what makes you a strong match?`,
      `لماذا تريد وظيفة ${title}، وما الذي يجعلك مناسباً بقوة؟`,
      "fit",
      "Link skills to the job.",
    ),
    q(
      "job-2",
      `Walk me through a recent achievement that would help you succeed as a ${title}.`,
      `اسرد إنجازاً حديثاً يساعد على نجاحك كـ ${title}.`,
      "achievement",
      "Quantify results if possible.",
    ),
    q(
      "job-3",
      "How would you handle the first 90 days in this position?",
      "كيف ستتعامل مع أول 90 يوماً في هذا المنصب؟",
      "planning",
      "Show a clear ramp-up plan.",
    ),
    q(
      "job-4",
      "Describe a disagreement with a manager or teammate and how you resolved it.",
      "صف خلافاً مع مدير أو زميل وكيف حللته.",
      "conflict",
      "Emphasize listening and outcomes.",
    ),
    q(
      "job-5",
      "What questions do you have about the team, tools, or success metrics for this role?",
      "ما أسئلتك عن الفريق أو الأدوات أو مقاييس النجاح لهذا الدور؟",
      "curiosity",
      "Ask thoughtful, role-specific questions.",
      90,
    ),
  ];
}

function clampTime(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 120;
  return Math.min(600, Math.max(30, Math.round(n)));
}

/** Tolerant parse of Claude packs for job-seeker video interviews. */
export function normalizeVideoInterviewQuestions(raw: unknown): VideoInterviewQuestion[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const arr = Array.isArray(root.questions)
    ? root.questions
    : Array.isArray(raw)
      ? raw
      : [];

  const out: VideoInterviewQuestion[] = [];
  let i = 0;
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const question =
      (typeof row.question === "string" && row.question.trim()) ||
      (typeof row.prompt === "string" && row.prompt.trim()) ||
      (typeof row.text === "string" && row.text.trim()) ||
      "";
    if (!question) continue;
    i += 1;
    const questionAr =
      (typeof row.questionAr === "string" && row.questionAr.trim()) ||
      (typeof row.promptAr === "string" && row.promptAr.trim()) ||
      question;
    const followUp =
      (typeof row.followUp === "string" && row.followUp.trim()) ||
      (typeof row.followUpPrompt === "string" && row.followUpPrompt.trim()) ||
      "";
    const followUpAr =
      (typeof row.followUpAr === "string" && row.followUpAr.trim()) ||
      (typeof row.followUpPromptAr === "string" && row.followUpPromptAr.trim()) ||
      followUp;
    out.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `ai-${Date.now().toString(36)}-${i}`,
      question: question.slice(0, 2000),
      questionAr: questionAr.slice(0, 2000),
      category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : "general",
      timeLimit: clampTime(row.timeLimit ?? row.timeLimitSec ?? row.time_limit),
      tips: typeof row.tips === "string" ? row.tips.slice(0, 500) : "",
      ...(followUp
        ? { followUp: followUp.slice(0, 2000), followUpAr: followUpAr.slice(0, 2000) }
        : {}),
      ...(typeof row.stage === "string" && row.stage.trim() ? { stage: row.stage.trim() } : {}),
    });
    if (out.length >= 10) break;
  }
  return out;
}
