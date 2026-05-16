import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export type AssessmentSummaryRow = {
  id: string;
  type: string;
  status: string;
  totalScore: number | null;
  completedAt: string | null;
  shareWithEmployers: boolean;
  isFlagged: boolean;
};

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<ApiResponse<{ assessments: AssessmentSummaryRow[] }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const rows = await prisma.assessment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      type: true,
      status: true,
      totalScore: true,
      completedAt: true,
      shareWithEmployers: true,
      isFlagged: true,
    },
  });

  const assessments: AssessmentSummaryRow[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    totalScore: r.totalScore,
    completedAt: r.completedAt?.toISOString() ?? null,
    shareWithEmployers: r.shareWithEmployers,
    isFlagged: r.isFlagged,
  }));

  return NextResponse.json({ success: true, data: { assessments } }, { status: 200 });
}
