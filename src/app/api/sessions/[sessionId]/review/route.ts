import { SessionStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const authSession = await getServerSession();
  if (!authSession?.user?.id || authSession.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const { sessionId } = await ctx.params;
  const prisma = getPrisma();

  const row = await prisma.mentorSession.findFirst({
    where: {
      id: sessionId,
      menteeId: authSession.user.id,
      status: SessionStatus.COMPLETED,
    },
    include: { mentor: true },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.mentorSession.update({
    where: { id: row.id },
    data: {
      rating: parsed.data.rating,
      review: parsed.data.review?.trim() || null,
      reviewedAt: new Date(),
    },
  });

  const agg = await prisma.mentorSession.aggregate({
    where: { mentorId: row.mentorId, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  if (agg._count.rating > 0 && agg._avg.rating) {
    await prisma.mentor.update({
      where: { id: row.mentorId },
      data: { averageRating: agg._avg.rating },
    });
  }

  return NextResponse.json({ success: true, data: { ok: true } });
}
