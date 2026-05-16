import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { generateEmployerInterviewQuestions } from "@/lib/employer-interview/ai-questions";
import type { InterviewQuestion } from "@/lib/employer-interview/template";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<{ suggestions: InterviewQuestion[] }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { title: true, description: true },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const suggestions = await generateEmployerInterviewQuestions({
    jobTitle: job.title,
    jobDescription: job.description,
    count: 5,
  });

  if (!suggestions?.length) {
    return NextResponse.json({ success: false, error: "ai_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ success: true, data: { suggestions } }, { status: 200 });
}
