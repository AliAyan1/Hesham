import { AssessmentStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import type { AdminTalentPoolPayload } from "@/types/admin";

function tagsFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string").slice(0, 3);
}

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const prisma = getPrisma();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const rows = await prisma.talentPoolEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          inTalentPool: true,
          assessments: {
            where: { status: AssessmentStatus.COMPLETED },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { totalScore: true },
          },
        },
      },
    },
  });

  const addedThisWeek = rows.filter((r) => r.createdAt >= weekAgo).length;
  const scores = rows
    .map((r) => r.user.assessments[0]?.totalScore)
    .filter((s): s is number => s != null);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const data: AdminTalentPoolPayload = {
    summary: {
      total: rows.length,
      addedThisWeek,
      exitedImproved: 0,
      averageScore,
    },
    items: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      image: r.user.image,
      email: r.user.email,
      assessmentScore: r.user.assessments[0]?.totalScore ?? null,
      skills: tagsFromJson(r.trainingTags),
      category: r.reason,
      reason: r.reason,
      addedAt: r.createdAt.toISOString(),
      progressPercent: r.user.inTalentPool ? 35 : 100,
    })),
  };

  return NextResponse.json(
    { success: true, data },
    { headers: adminCacheHeaders() },
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  const entryId = request.nextUrl.searchParams.get("entryId");
  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const entry = await prisma.talentPoolEntry.findUnique({
    where: { id: entryId },
    select: { id: true, userId: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.talentPoolEntry.delete({ where: { id: entryId } }),
    prisma.user.update({
      where: { id: entry.userId },
      data: { inTalentPool: false, talentPoolReason: null, talentPoolDate: null },
    }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "ADMIN_TALENT_POOL_REMOVE",
    entity: "TalentPoolEntry",
    entityId: entryId,
  });

  return NextResponse.json({ success: true });
}
