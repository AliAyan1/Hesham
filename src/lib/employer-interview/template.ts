import { z } from "zod";

export const interviewQuestionTypeSchema = z.enum(["voice", "multiple_choice", "yes_no"]);

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  type: interviewQuestionTypeSchema,
  prompt: z.string().min(1).max(2000),
  promptAr: z.string().max(2000).optional(),
  timeLimitSec: z.number().int().min(30).max(600),
  options: z.array(z.string().max(500)).max(12).optional(),
});

export const interviewSettingsSchema = z.object({
  maxDurationMin: z.number().int().min(5).max(120).default(30),
  passScorePercent: z.number().int().min(0).max(100).default(50),
  autoInviteOnApply: z.boolean().default(false),
  allowRetake: z.boolean().default(true),
  retakeWaitHours: z.number().int().min(1).max(168).default(24),
});

export const interviewTemplateSchema = z.object({
  mode: z.enum(["ai", "custom"]),
  questions: z.array(interviewQuestionSchema).max(25),
  settings: interviewSettingsSchema,
});

export type InterviewQuestionType = z.infer<typeof interviewQuestionTypeSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type InterviewSettings = z.infer<typeof interviewSettingsSchema>;
export type JobInterviewTemplate = z.infer<typeof interviewTemplateSchema>;

export function defaultInterviewTemplate(): JobInterviewTemplate {
  return {
    mode: "ai",
    questions: [],
    settings: {
      maxDurationMin: 30,
      passScorePercent: 50,
      autoInviteOnApply: false,
      allowRetake: true,
      retakeWaitHours: 24,
    },
  };
}

export function parseInterviewTemplate(raw: unknown): JobInterviewTemplate | null {
  const v = interviewTemplateSchema.safeParse(raw);
  return v.success ? v.data : null;
}

export function newQuestionId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
