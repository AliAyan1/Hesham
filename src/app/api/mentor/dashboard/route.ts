import { SessionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";
import { toMentorSessionListItem } from "@/lib/mentor/session-list-item";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

export async function GET(): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const prisma = getPrisma();
  const mentor = await prisma.mentor.findUnique({
    where: { id: auth.ctx.mentorId },
    include: {
      user: { select: { name: true, image: true } },
    },
  });
  if (!mentor) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const [sessionsThisMonth, sessionsLastMonth, upcoming, pendingRequests, recentReviews] =
    await Promise.all([
      prisma.mentorSession.count({
        where: { mentorId: mentor.id, createdAt: { gte: monthStart } },
      }),
      prisma.mentorSession.count({
        where: {
          mentorId: mentor.id,
          createdAt: { gte: lastMonthStart, lt: monthStart },
        },
      }),
      prisma.mentorSession.findMany({
        where: {
          mentorId: mentor.id,
          status: SessionStatus.CONFIRMED,
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        include: {
          mentee: { select: { id: true, name: true, image: true, role: true } },
        },
      }),
      prisma.mentorSession.findMany({
        where: { mentorId: mentor.id, status: SessionStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          mentee: { select: { id: true, name: true, image: true, role: true } },
        },
      }),
      prisma.mentorSession.findMany({
        where: {
          mentorId: mentor.id,
          status: SessionStatus.COMPLETED,
          rating: { not: null },
        },
        orderBy: { endedAt: "desc" },
        take: 3,
        include: {
          mentee: { select: { id: true, name: true, image: true, role: true } },
        },
      }),
    ]);

  const earningsThisMonth = await prisma.mentorSession.aggregate({
    where: {
      mentorId: mentor.id,
      status: SessionStatus.COMPLETED,
      endedAt: { gte: monthStart },
    },
    _sum: { mentorEarning: true },
  });

  const completedCount = await prisma.mentorSession.count({
    where: { mentorId: mentor.id, status: SessionStatus.COMPLETED },
  });

  return NextResponse.json({
    success: true,
    data: {
      mentor: {
        id: mentor.id,
        isApproved: mentor.isApproved,
        isActive: mentor.isActive,
        averageRating: mentor.averageRating,
        pendingPayout: mentor.pendingPayout,
        totalEarnings: mentor.totalEarnings,
        user: mentor.user,
      },
      stats: {
        sessionsThisMonth,
        sessionsLastMonthDelta: sessionsThisMonth - sessionsLastMonth,
        earningsThisMonth: earningsThisMonth._sum.mentorEarning ?? 0,
        completedCount,
      },
      upcoming: upcoming.map((s) => toMentorSessionListItem(s, auth.ctx.userId)),
      pendingRequests: pendingRequests.map((s) => toMentorSessionListItem(s, auth.ctx.userId)),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        mentee: sanitizeUserForPublic(r.mentee),
      })),
    },
  });
}
