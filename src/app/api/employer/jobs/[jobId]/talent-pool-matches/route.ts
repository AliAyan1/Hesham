import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import type { ApiResponse } from "@/types";
import { findTalentPoolMatchesForJob } from "@/lib/talent-pool/talent-pool-matching";
import { getPrisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<
  NextResponse<ApiResponse<{ count: number; items: Awaited<ReturnType<typeof findTalentPoolMatchesForJob>> }>>
> {
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

  const items = await findTalentPoolMatchesForJob(jobId);
  return NextResponse.json({ success: true, data: { count: items.length, items } });
}
