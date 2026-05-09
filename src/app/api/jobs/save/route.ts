import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  jobId: z.string().min(1),
  saved: z.boolean(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ saved: boolean }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const exists = await prisma.job.findFirst({
    where: { id: parsed.data.jobId, isActive: true },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  if (parsed.data.saved) {
    await prisma.savedJob.upsert({
      where: {
        userId_jobId: { userId: session.user.id, jobId: parsed.data.jobId },
      },
      create: { userId: session.user.id, jobId: parsed.data.jobId },
      update: {},
      select: { id: true },
    });
  } else {
    await prisma.savedJob.deleteMany({
      where: { userId: session.user.id, jobId: parsed.data.jobId },
    });
  }

  return NextResponse.json({ success: true, data: { saved: parsed.data.saved } });
}
