import { SessionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

export async function GET(): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const prisma = getPrisma();
  const mentor = await prisma.mentor.findUnique({
    where: { id: auth.ctx.mentorId },
    select: {
      totalEarnings: true,
      pendingPayout: true,
      payoutRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          createdAt: true,
          processedAt: true,
        },
      },
    },
  });

  if (!mentor) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthAgg = await prisma.mentorSession.aggregate({
    where: {
      mentorId: auth.ctx.mentorId,
      status: SessionStatus.COMPLETED,
      endedAt: { gte: monthStart },
    },
    _sum: { mentorEarning: true },
  });

  const lastPaid = mentor.payoutRequests.find((p) => p.status === "PAID");

  const sessions = await prisma.mentorSession.findMany({
    where: { mentorId: auth.ctx.mentorId, status: SessionStatus.COMPLETED },
    orderBy: { endedAt: "desc" },
    take: 50,
    include: {
      mentee: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      totalEarnings: mentor.totalEarnings,
      earningsThisMonth: monthAgg._sum.mentorEarning ?? 0,
      pendingPayout: mentor.pendingPayout,
      lastPayoutAmount: lastPaid?.amount ?? null,
      lastPayoutDate: lastPaid?.processedAt?.toISOString() ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.endedAt?.toISOString() ?? s.scheduledAt?.toISOString() ?? null,
        duration: s.duration,
        price: s.price,
        mentorEarning: s.mentorEarning,
        payoutStatus: s.payoutStatus,
        mentee: sanitizeUserForPublic(s.mentee),
      })),
      payoutHistory: mentor.payoutRequests.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        reference: p.reference,
        date: (p.processedAt ?? p.createdAt).toISOString(),
      })),
    },
  });
}
