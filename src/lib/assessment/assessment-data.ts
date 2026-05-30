import type { ProfileXtQuestion } from "@/lib/assessment/profilext-types";
import type { Assessment } from "@prisma/client";

/** Read questions from assessment row (supports legacy `questions` field) */
export function getQuestionsData(row: Pick<Assessment, "questionsData"> & { questions?: unknown }): ProfileXtQuestion[] {
  const raw = row.questionsData ?? row.questions;
  if (!raw || !Array.isArray(raw)) return [];
  return raw as ProfileXtQuestion[];
}

/** Read all accumulated answers */
export function getAnswersData(row: Pick<Assessment, "answersData"> & { answers?: unknown }): Array<{ questionId: string; value: string | number }> {
  const raw = row.answersData ?? row.answers;
  if (!raw || !Array.isArray(raw)) return [];
  return raw as Array<{ questionId: string; value: string | number }>;
}

export function parseTraitScores(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, number>;
}

export function parseWrittenReport(raw: unknown): unknown {
  return raw ?? null;
}
