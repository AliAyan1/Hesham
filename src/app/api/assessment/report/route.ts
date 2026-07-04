import { AssessmentStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET as getAssessmentDetail } from "@/app/api/assessment/detail/route";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { runApiRoute, apiFailure } from "@/lib/api/route-handler";

export async function GET(): Promise<NextResponse> {
  return runApiRoute("assessment/report", async () => {
    const session = await getServerSession();
    if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
      return apiFailure("Unauthorized", 401);
    }

    const prisma = getPrisma();
    const latest = await prisma.assessment.findFirst({
      where: {
        userId: session.user.id,
        status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
      },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });

    if (!latest) {
      return apiFailure("Not found", 404);
    }

    const detailRequest = new NextRequest(
      `http://internal/api/assessment/detail?id=${encodeURIComponent(latest.id)}`,
    );
    return getAssessmentDetail(detailRequest);
  });
}
