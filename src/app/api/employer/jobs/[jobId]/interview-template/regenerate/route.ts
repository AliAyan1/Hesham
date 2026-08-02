import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import {
  generateEmployerInterviewQuestions,
  TARGET_INTERVIEW_QUESTION_COUNT,
} from "@/lib/employer-interview/ai-questions";
import { experienceLevelSchema, type InterviewQuestion } from "@/lib/employer-interview/template";

export const maxDuration = 90;

const bodySchema = z.object({
  experienceLevel: experienceLevelSchema.optional(),
  count: z.number().int().min(5).max(TARGET_INTERVIEW_QUESTION_COUNT).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<
  NextResponse<
    ApiResponse<{
      questions: InterviewQuestion[];
      resolvedLevel: "fresher" | "experienced";
      analysisSummary: string;
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const raw: unknown = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { title: true, description: true },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const result = await generateEmployerInterviewQuestions({
    jobTitle: job.title,
    jobDescription: job.description,
    count: parsed.data.count ?? TARGET_INTERVIEW_QUESTION_COUNT,
    experienceLevel: parsed.data.experienceLevel ?? "auto",
  });

  if (!result.questions.length) {
    return NextResponse.json({ success: false, error: "ai_unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        questions: result.questions,
        resolvedLevel: result.resolvedLevel,
        analysisSummary: result.analysisSummary,
      },
    },
    { status: 200 },
  );
}
