import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { hasAccess } from "@/lib/subscription";
import type { ApiResponse, SubscriptionTier } from "@/types";

const MAX_BYTES = 104_857_600; // ~100 MB

const fieldsSchema = z.object({
  interviewId: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (userRow?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_assessment")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid multipart body" }, { status: 400 });
  }

  const interviewIdRaw = form.get("interviewId");
  const file = form.get("file");
  const parsedFields = fieldsSchema.safeParse({
    interviewId: typeof interviewIdRaw === "string" ? interviewIdRaw : "",
  });
  if (!parsedFields.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  if (!(file instanceof Blob) || file.size < 16) {
    return NextResponse.json({ success: false, error: "Recording file required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: "Recording too large" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const rawType = file.type?.trim() ?? "";
  const mime = (rawType.startsWith("video/") || rawType.startsWith("audio/") ? rawType : "video/webm").slice(0, 120);

  const row = await prisma.videoInterview.findFirst({
    where: {
      id: parsedFields.data.interviewId,
      userId: session.user.id,
      OR: [
        { status: InterviewStatus.IN_PROGRESS },
        {
          status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
          recordingData: null,
        },
      ],
    },
    select: { id: true },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
  }

  await prisma.videoInterview.update({
    where: { id: row.id },
    data: {
      recordingData: buf,
      recordingMimeType: mime,
    },
  });

  return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
}
