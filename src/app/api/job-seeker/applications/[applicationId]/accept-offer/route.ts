import { ApplicationStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await ctx.params;
  const prisma = getPrisma();

  const app = await prisma.application.findFirst({
    where: {
      id: applicationId,
      jobSeekerId: session.user.id,
      status: ApplicationStatus.SHORTLISTED,
    },
    select: { id: true, offerAcceptedAt: true },
  });
  if (!app) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.application.update({
    where: { id: app.id },
    data: { offerAcceptedAt: new Date() },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
}
