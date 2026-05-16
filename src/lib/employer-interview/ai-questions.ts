import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { z } from "zod";
import { newQuestionId, type InterviewQuestion } from "@/lib/employer-interview/template";

const packSchema = z.object({
  questions: z.array(
    z.object({
      prompt: z.string(),
      promptAr: z.string().optional(),
      type: z.enum(["voice", "multiple_choice", "yes_no"]),
      timeLimitSec: z.number().int().min(30).max(600),
      options: z.array(z.string()).max(8).optional(),
    }),
  ),
});

export async function generateEmployerInterviewQuestions(params: {
  jobTitle: string;
  jobDescription: string;
  count: number;
}): Promise<InterviewQuestion[] | null> {
  const user =
    `Job title: ${params.jobTitle}\n` +
    `Job description (excerpt):\n${params.jobDescription.slice(0, 8000)}\n\n` +
    `Return ONLY JSON: {"questions":[{"prompt":"","promptAr":"","type":"voice"|"multiple_choice"|"yes_no","timeLimitSec":60,"options":string[]?}]}\n` +
    `Include exactly ${params.count} questions. Prefer "voice" for open competency questions. ` +
    `For multiple_choice include 3–5 concise options. timeLimitSec 45–120.`;

  const claude = await fetchClaudeJsonText({
    system: "You output a single JSON object only. No markdown.",
    user,
    maxTokens: 4096,
  });
  if (!claude.ok) return null;
  try {
    const json = parseJsonFromModel(claude.text);
    const v = packSchema.safeParse(json);
    if (!v.success) return null;
    return v.data.questions.map((q) => ({
      id: newQuestionId(),
      type: q.type,
      prompt: q.prompt.slice(0, 2000),
      promptAr: q.promptAr?.slice(0, 2000),
      timeLimitSec: q.timeLimitSec,
      options: q.options?.length ? q.options : undefined,
    }));
  } catch {
    return null;
  }
}
