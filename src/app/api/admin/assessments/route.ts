import { AssessmentStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import type { AdminAssessmentRow } from "@/types/admin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const minScore = sp.get("minScore");
  const maxScore = sp.get("maxScore");

  const prisma = getPrisma();
  const where: {
    status?: AssessmentStatus;
    isFlagged?: boolean;
    totalScore?: { gte?: number; lte?: number };
  } = {};

  if (status === "flagged") {
    where.isFlagged = true;
  } else if (status === "completed") {
    where.status = AssessmentStatus.COMPLETED;
  } else if (status === "in-progress") {
    where.status = AssessmentStatus.IN_PROGRESS;
  }

  if (minScore || maxScore) {
    where.totalScore = {};
    if (minScore) where.totalScore.gte = Number(minScore);
    if (maxScore) where.totalScore.lte = Number(maxScore);
  }

  const [rows, total, completed, flagged, inProgress] = await Promise.all([
    prisma.assessment.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, image: true } },
        proctoringSessions: {
          select: { tabSwitches: true, faceNotVisible: true, flags: true },
        },
      },
    }),
    prisma.assessment.count(),
    prisma.assessment.count({ where: { status: AssessmentStatus.COMPLETED } }),
    prisma.assessment.count({
      where: { OR: [{ isFlagged: true }, { status: AssessmentStatus.FLAGGED }] },
    }),
    prisma.assessment.count({ where: { status: AssessmentStatus.IN_PROGRESS } }),
  ]);

  const items: AdminAssessmentRow[] = rows.map((a) => {
    const flagCount =
      a.proctoringSessions.reduce(
        (s, p) => s + p.tabSwitches + p.faceNotVisible,
        0,
      ) + (a.isFlagged ? 1 : 0);
    return {
      id: a.id,
      userId: a.userId,
      name: a.user.name,
      image: a.user.image,
      score: a.totalScore,
      status: a.status,
      flagCount,
      completedAt: a.completedAt?.toISOString() ?? null,
      duration: a.duration,
      isFlagged: a.isFlagged,
      proctoringFlags: a.proctoringFlags,
    };
  });

  return NextResponse.json(
    {
      success: true,
      data: { items, stats: { total, completed, flagged, inProgress } },
    },
    { headers: adminCacheHeaders() },
  );
}
