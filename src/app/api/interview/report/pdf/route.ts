import { InterviewStatus, UserRole } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { enhancedInterviewReportSchema } from "@/lib/interview/enhanced-report-types";
import { InterviewReportPdf } from "@/lib/interview/pdf-report";
import { generateEnhancedInterviewReport } from "@/lib/interview/generate-enhanced-report";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const interviewId = request.nextUrl.searchParams.get("interviewId")?.trim();
  const localeParam = request.nextUrl.searchParams.get("locale")?.trim();
  const locale = localeParam === "ar" ? "ar" : "en";

  if (!interviewId) {
    return NextResponse.json({ success: false, error: "interviewId required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.videoInterview.findUnique({
    where: { id: interviewId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!row || (row.status !== InterviewStatus.COMPLETED && row.status !== InterviewStatus.FLAGGED)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const isOwner = row.userId === session.user.id;
  const isEmployer = session.user.role === UserRole.EMPLOYER;
  if (!isOwner && !isEmployer) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (isEmployer && row.jobId) {
    const job = await prisma.job.findFirst({
      where: { id: row.jobId, employerId: session.user.id },
      select: { id: true, title: true },
    });
    if (!job) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  }

  let parsed = row.enhancedReport ? enhancedInterviewReportSchema.safeParse(row.enhancedReport) : null;
  if (!parsed?.success) {
    const generated = await generateEnhancedInterviewReport(interviewId);
    if (!generated) {
      return NextResponse.json({ success: false, error: "Report not ready" }, { status: 409 });
    }
    parsed = { success: true, data: generated };
  }

  let jobTitle = "Role";
  if (row.jobId) {
    const job = await prisma.job.findUnique({ where: { id: row.jobId }, select: { title: true } });
    if (job?.title) jobTitle = job.title;
  }

  const buffer = await renderToBuffer(
    InterviewReportPdf({
      candidateName: row.user.name ?? row.user.email,
      jobTitle,
      completedAt: row.completedAt?.toISOString().slice(0, 10) ?? "",
      report: parsed.data,
      locale,
    }),
  );

  const suffix = locale === "ar" ? "ar" : "en";
  const filename = `qudrahtech-interview-${interviewId.slice(0, 8)}-${suffix}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
