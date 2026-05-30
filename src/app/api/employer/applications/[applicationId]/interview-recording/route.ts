import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const interviewId = request.nextUrl.searchParams.get("interviewId")?.trim();
  if (!interviewId) {
    return NextResponse.json({ success: false, error: "interviewId required" }, { status: 400 });
  }

  const { applicationId } = await ctx.params;
  const prisma = getPrisma();

  const app = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { employerId: session.user.id },
    },
    select: { jobSeekerId: true, jobId: true },
  });

  if (!app) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const iv = await prisma.videoInterview.findFirst({
    where: {
      id: interviewId,
      userId: app.jobSeekerId,
      status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
      recordingData: { not: null },
    },
    select: {
      recordingData: true,
      recordingMimeType: true,
      jobId: true,
      interviewKind: true,
    },
  });

  if (!iv || !iv.recordingData) {
    return NextResponse.json({ success: false, error: "Recording not available" }, { status: 404 });
  }

  if (iv.interviewKind === "job" && iv.jobId != null && iv.jobId !== app.jobId) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const mime = iv.recordingMimeType?.trim() || "audio/webm";
  const filename =
    mime.includes("webm") ? "candidate-interview.webm" : mime.includes("mpeg") ? "candidate-interview.mp3" : "candidate-interview.audio";

  return new Response(new Uint8Array(iv.recordingData), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
