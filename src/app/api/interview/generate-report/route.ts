import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { generateEnhancedInterviewReport } from "@/lib/interview/generate-enhanced-report";
import { enhancedInterviewReportSchema } from "@/lib/interview/enhanced-report-types";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  interviewId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ report: z.infer<typeof enhancedInterviewReportSchema> }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.videoInterview.findFirst({
    where: { id: parsed.data.interviewId },
    select: { id: true, userId: true, status: true, enhancedReport: true },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const isOwner = row.userId === session.user.id;
  const isEmployer = session.user.role === UserRole.EMPLOYER;
  if (!isOwner && !isEmployer) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (row.status !== InterviewStatus.COMPLETED && row.status !== InterviewStatus.FLAGGED) {
    return NextResponse.json({ success: false, error: "Interview not complete" }, { status: 409 });
  }

  if (row.enhancedReport) {
    const existing = enhancedInterviewReportSchema.safeParse(row.enhancedReport);
    if (existing.success) {
      return NextResponse.json({ success: true, data: { report: existing.data } }, { status: 200 });
    }
  }

  const report = await generateEnhancedInterviewReport(parsed.data.interviewId);
  if (!report) {
    return NextResponse.json({ success: false, error: "Report generation failed" }, { status: 503 });
  }

  return NextResponse.json({ success: true, data: { report } }, { status: 200 });
}
