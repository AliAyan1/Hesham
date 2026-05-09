import { NextResponse, type NextRequest } from "next/server";
import { ApplicationStatus, UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await ctx.params;
  const prisma = getPrisma();
  const seekerId = session.user.id;

  const existing = await prisma.application.findFirst({
    where: {
      id: applicationId,
      jobSeekerId: seekerId,
      status: ApplicationStatus.PENDING,
    },
    select: { id: true, jobId: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.application.delete({ where: { id: existing.id }, select: { id: true } });
    await tx.job.update({
      where: { id: existing.jobId },
      data: {
        applicationCount: { decrement: 1 },
      },
      select: { id: true },
    });
  });

  return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
}
