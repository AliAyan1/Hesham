import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import {
  newQuestionId,
  type ExperienceLevel,
  type InterviewQuestion,
  type InterviewQuestionStage,
} from "@/lib/employer-interview/template";

export const TARGET_INTERVIEW_QUESTION_COUNT = 13;

function clampTimeLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 90;
  return Math.min(600, Math.max(30, Math.round(n)));
}

function normalizeType(_raw: unknown): InterviewQuestion["type"] {
  // Voice-only interviews: Lara speaks, candidate answers by voice.
  return "voice";
}

const STAGES: InterviewQuestionStage[] = [
  "introduction",
  "experience",
  "technical",
  "behavioral",
  "situational",
  "follow_up",
  "closing",
];

function normalizeStage(raw: unknown, index: number): InterviewQuestionStage {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if ((STAGES as string[]).includes(s)) return s as InterviewQuestionStage;
  if (index === 0) return "introduction";
  if (index === 1 || index === 2) return "experience";
  if (index >= 3 && index <= 6) return "technical";
  if (index >= 7 && index <= 9) return "behavioral";
  if (index === 10 || index === 11) return "situational";
  return "closing";
}

function extractPrompt(item: Record<string, unknown>): string {
  const candidates = [item.prompt, item.question, item.text, item.q];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 2000);
  }
  return "";
}

function extractPromptAr(item: Record<string, unknown>): string | undefined {
  const candidates = [item.promptAr, item.questionAr, item.textAr];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 2000);
  }
  return undefined;
}

function extractFollowUp(item: Record<string, unknown>): string | undefined {
  const candidates = [item.followUpPrompt, item.followUp, item.follow_up, item.probe];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 2000);
  }
  return undefined;
}

function extractFollowUpAr(item: Record<string, unknown>): string | undefined {
  const candidates = [item.followUpPromptAr, item.followUpAr, item.follow_up_ar];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 2000);
  }
  return undefined;
}

export function normalizeExperienceLevel(raw: unknown): ExperienceLevel {
  const s = String(raw ?? "auto").toLowerCase();
  if (s === "fresher" || s === "junior" || s === "entry" || s === "entry_level") return "fresher";
  if (s === "experienced" || s === "senior" || s === "mid" || s === "mid_level") return "experienced";
  return "auto";
}

/** Tolerant parse — Claude often drifts from the exact schema. */
export function normalizeEmployerAiQuestions(raw: unknown, count: number): InterviewQuestion[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const arr = Array.isArray(root.questions)
    ? root.questions
    : Array.isArray(raw)
      ? raw
      : [];

  const out: InterviewQuestion[] = [];
  for (const [index, item] of arr.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const prompt = extractPrompt(row);
    if (!prompt) continue;
    const type = normalizeType(row.type);
    const promptAr = extractPromptAr(row);
    const followUpPrompt = extractFollowUp(row);
    const followUpPromptAr = extractFollowUpAr(row);
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id : newQuestionId(),
      type,
      prompt,
      ...(promptAr ? { promptAr } : {}),
      timeLimitSec: clampTimeLimit(row.timeLimitSec ?? row.timeLimit ?? row.time_limit),
      options: undefined,
      stage: normalizeStage(row.stage ?? row.category, index),
      ...(followUpPrompt ? { followUpPrompt } : {}),
      ...(followUpPromptAr ? { followUpPromptAr } : {}),
    });
    if (out.length >= count) break;
  }
  return out;
}

function withId(q: Omit<InterviewQuestion, "id">): InterviewQuestion {
  return { ...q, id: newQuestionId() };
}

export function fallbackEmployerInterviewQuestions(
  jobTitle: string,
  count: number,
  level: ExperienceLevel = "auto",
): InterviewQuestion[] {
  const title = jobTitle.trim() || "this role";
  const isFresher = level === "fresher";

  const bank: Array<Omit<InterviewQuestion, "id">> = [
    {
      type: "voice",
      stage: "introduction",
      prompt: `Please introduce yourself briefly and tell us what draws you to the ${title} role.`,
      promptAr: `قدّم نفسك باختصار وأخبرنا ما الذي يجذبك إلى منصب ${title}.`,
      timeLimitSec: 90,
      followUpPrompt: "What is one personal strength you want us to remember from that introduction?",
      followUpPromptAr: "ما القوة الشخصية الواحدة التي تريد أن نتذكرها من مقدمتك؟",
    },
    {
      type: "voice",
      stage: "experience",
      prompt: isFresher
        ? `As someone earlier in your career, what projects, coursework, or internships prepared you for ${title}?`
        : `Walk us through your most relevant professional experience for a ${title} position.`,
      promptAr: isFresher
        ? `كمبتدئ في مسارك المهني، ما المشاريع أو المقررات أو التدريبات التي أعدّتك لـ ${title}؟`
        : `اسرد خبرتك المهنية الأكثر صلة بمنصب ${title}.`,
      timeLimitSec: 120,
      followUpPrompt: "What was your specific contribution versus the team's?",
      followUpPromptAr: "ما كان إسهامك المحدد مقابل دور الفريق؟",
    },
    {
      type: "voice",
      stage: "experience",
      prompt: isFresher
        ? "Describe a learning experience where you had to pick up a new skill quickly."
        : "Describe how your responsibilities grew over the last two roles.",
      promptAr: isFresher
        ? "صف تجربة تعلّم اضطررت فيها لاكتساب مهارة جديدة بسرعة."
        : "صف كيف نمت مسؤولياتك خلال آخر وظيفتين.",
      timeLimitSec: 120,
      followUpPrompt: "What would you do differently if you faced that situation again?",
      followUpPromptAr: "ماذا ستفعل بشكل مختلف لو واجهت ذلك الموقف مجدداً؟",
    },
    {
      type: "voice",
      stage: "technical",
      prompt: `What core skills make you effective in ${title} work, and how have you applied them?`,
      promptAr: `ما المهارات الأساسية التي تجعلك فعّالاً في عمل ${title}، وكيف طبّقتها؟`,
      timeLimitSec: 120,
      followUpPrompt: "Give one concrete metric or outcome from applying those skills.",
      followUpPromptAr: "أعط مقياساً أو نتيجة ملموسة من تطبيق تلك المهارات.",
    },
    {
      type: "voice",
      stage: "technical",
      prompt: isFresher
        ? `Explain a technical concept related to ${title} as if teaching a teammate.`
        : `Describe a complex technical decision you owned that impacted ${title}-related delivery.`,
      promptAr: isFresher
        ? `اشرح مفهوماً تقنياً يتعلق بـ ${title} كما لو كنت تعلّم زميلاً.`
        : `صف قراراً تقنياً معقداً كنت مسؤولاً عنه وأثر على التسليم المتعلق بـ ${title}.`,
      timeLimitSec: 120,
      followUpPrompt: "What trade-offs did you consider?",
      followUpPromptAr: "ما المقايضات التي فكرت فيها؟",
    },
    {
      type: "voice",
      stage: "technical",
      prompt: `How do you validate quality in your ${title} work before handing it off?`,
      promptAr: `كيف تتحقق من الجودة في عملك كـ ${title} قبل تسليمه؟`,
      timeLimitSec: 90,
      followUpPrompt: "Tell me about a defect you caught late — what changed afterward?",
      followUpPromptAr: "أخبرني عن عيب اكتشفته متأخراً — ماذا تغيّر بعد ذلك؟",
    },
    {
      type: "voice",
      stage: "technical",
      prompt: "Which environment do you perform best in, and why?",
      promptAr: "في أي بيئة تؤدّي بأفضل شكل، ولماذا؟",
      timeLimitSec: 90,
      followUpPrompt: "Give one example from a past project that proves this.",
      followUpPromptAr: "أعط مثالاً من مشروع سابق يثبت ذلك.",
    },
    {
      type: "voice",
      stage: "behavioral",
      prompt: "Tell me about a time you disagreed with a teammate or mentor. How did you handle it?",
      promptAr: "أخبرني عن خلاف مع زميل أو موجّه. كيف تعاملت معه؟",
      timeLimitSec: 120,
      followUpPrompt: "What was the final outcome for the relationship and the work?",
      followUpPromptAr: "ما النتيجة النهائية للعلاقة وللعمل؟",
    },
    {
      type: "voice",
      stage: "behavioral",
      prompt: "Describe a deadline pressure moment and how you prioritized.",
      promptAr: "صف لحظة ضغط بسبب موعد نهائي وكيف رتّبت الأولويات.",
      timeLimitSec: 120,
      followUpPrompt: "What did you intentionally deprioritize, and why?",
      followUpPromptAr: "ما الذي أخّرته عمداً، ولماذا؟",
    },
    {
      type: "voice",
      stage: "behavioral",
      prompt: isFresher
        ? "How do you ask for help when you are stuck, and how do you stay accountable?"
        : "How do you mentor or unblock others while still delivering your own work?",
      promptAr: isFresher
        ? "كيف تطلب المساعدة عندما تعلق، وكيف تبقى مسؤولاً؟"
        : "كيف توجّه الآخرين أو تزيل عوائقهم مع الاستمرار في إنجاز عملك؟",
      timeLimitSec: 90,
    },
    {
      type: "voice",
      stage: "situational",
      prompt: `Imagine your first week as a ${title}. How would you ramp up and prove value quickly?`,
      promptAr: `تخيّل أسبوعك الأول كـ ${title}. كيف ستتأقلم وتثبت قيمتك بسرعة؟`,
      timeLimitSec: 120,
      followUpPrompt: "What would you measure after 30 days to know you are on track?",
      followUpPromptAr: "ماذا ستقيس بعد 30 يوماً لتعرف أنك على المسار الصحيح؟",
    },
    {
      type: "voice",
      stage: "situational",
      prompt: "Are you available to start within the next 30 days? If not, what timeline works for you?",
      promptAr: "هل أنت متاح للبدء خلال الثلاثين يوماً القادمة؟ إن لم يكن، ما الجدول الزمني المناسب؟",
      timeLimitSec: 60,
      followUpPrompt: "What would need to be true for you to start sooner?",
      followUpPromptAr: "ما الذي يجب أن يتحقق حتى تبدأ في وقت أقرب؟",
    },
    {
      type: "voice",
      stage: "closing",
      prompt: `Why should we choose you for this ${title} role over other candidates?`,
      promptAr: `لماذا يجب أن نختارك لمنصب ${title} دون غيرك؟`,
      timeLimitSec: 90,
      followUpPrompt: "What question do you have for us about the team or success criteria?",
      followUpPromptAr: "ما سؤالك لنا عن الفريق أو معايير النجاح؟",
    },
  ];

  return bank.slice(0, Math.max(1, Math.min(count, bank.length))).map(withId);
}

export type GenerateEmployerQuestionsResult = {
  questions: InterviewQuestion[];
  resolvedLevel: Exclude<ExperienceLevel, "auto">;
  analysisSummary: string;
};

export async function generateEmployerInterviewQuestions(params: {
  jobTitle: string;
  jobDescription: string;
  count?: number;
  experienceLevel?: ExperienceLevel;
}): Promise<GenerateEmployerQuestionsResult> {
  const count = Math.max(1, Math.min(TARGET_INTERVIEW_QUESTION_COUNT, params.count ?? TARGET_INTERVIEW_QUESTION_COUNT));
  const requestedLevel = normalizeExperienceLevel(params.experienceLevel);

  const user =
    `You are a senior hiring interviewer designing a serious video interview.\n` +
    `Job title: ${params.jobTitle}\n` +
    `Job description (excerpt):\n${params.jobDescription.slice(0, 8000)}\n\n` +
    `Employer requested experience level: ${requestedLevel}\n` +
    `(If "auto", decide fresher vs experienced from the job description seniority signals.)\n\n` +
    `Design exactly ${count} questions as a real interview arc:\n` +
    `1–2 introduction, then experience/background, then technical/role depth, then behavioral, then situational, then closing.\n` +
    `Fresher interviews: projects, learning agility, fundamentals, internships/coursework.\n` +
    `Experienced interviews: ownership, impact, architecture/trade-offs, leadership influence.\n` +
    `All questions MUST be type "voice" only (spoken interview — no multiple_choice, no yes_no).\n` +
    `For at least 8 questions, include a short followUpPrompt that a serious interviewer would ask AFTER hearing the candidate's answer (probe for evidence, metrics, trade-offs, ownership).\n` +
    `Also include Arabic promptAr / followUpPromptAr when possible.\n` +
    `timeLimitSec typically 60–120.\n\n` +
    `Return ONLY JSON:\n` +
    `{"resolvedLevel":"fresher"|"experienced","analysisSummary":"1 sentence why this level","questions":[{"prompt":"","promptAr":"","type":"voice","stage":"introduction"|"experience"|"technical"|"behavioral"|"situational"|"closing","timeLimitSec":90,"followUpPrompt":"","followUpPromptAr":""}]}`;

  const claude = await fetchClaudeJsonText({
    system:
      "You are an expert interviewer. Output a single JSON object only. No markdown. No commentary. Questions must be fair, professional, and non-discriminatory.",
    user,
    maxTokens: 8192,
  });

  if (claude.ok) {
    try {
      const json = parseJsonFromModel(claude.text) as Record<string, unknown>;
      const normalized = normalizeEmployerAiQuestions(json, count);
      const resolvedLevel =
        normalizeExperienceLevel(json.resolvedLevel ?? json.level) === "auto"
          ? requestedLevel === "auto"
            ? "experienced"
            : requestedLevel
          : (normalizeExperienceLevel(json.resolvedLevel ?? json.level) as Exclude<ExperienceLevel, "auto">);
      const analysisSummary =
        typeof json.analysisSummary === "string" && json.analysisSummary.trim()
          ? json.analysisSummary.trim().slice(0, 400)
          : `Structured ${resolvedLevel} interview for ${params.jobTitle}.`;

      if (normalized.length >= Math.min(8, count)) {
        // Pad with fallbacks if Claude returned fewer than requested.
        const padded =
          normalized.length < count
            ? [
                ...normalized,
                ...fallbackEmployerInterviewQuestions(params.jobTitle, count, resolvedLevel).slice(
                  normalized.length,
                ),
              ].slice(0, count)
            : normalized.slice(0, count);
        return { questions: padded, resolvedLevel, analysisSummary };
      }
      console.warn(
        "[employer-interview/ai] Claude returned too few valid questions:",
        normalized.length,
        "rawLen=",
        claude.text.length,
      );
    } catch (err) {
      console.error("[employer-interview/ai] parse failed:", err);
    }
  } else {
    console.error("[employer-interview/ai] Claude unavailable:", claude.error);
  }

  const resolvedLevel: Exclude<ExperienceLevel, "auto"> =
    requestedLevel === "auto" ? "experienced" : requestedLevel;
  return {
    questions: fallbackEmployerInterviewQuestions(params.jobTitle, count, resolvedLevel),
    resolvedLevel,
    analysisSummary: `Fallback ${resolvedLevel} interview pack for ${params.jobTitle}.`,
  };
}
