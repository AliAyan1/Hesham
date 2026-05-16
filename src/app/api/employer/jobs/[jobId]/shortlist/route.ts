import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<{ entries: unknown } | null>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const prisma = getPrisma();

  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const row = await prisma.jobAutoShortlist.findUnique({
    where: { jobId },
    select: { entries: true },
  });

  return NextResponse.json(
    { success: true, data: row ? { entries: row.entries } : { entries: [] } },
    { status: 200 },
  );
}
