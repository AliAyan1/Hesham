import { SessionStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { hasAccess } from "@/lib/subscription";
import type { SubscriptionTier } from "@prisma/client";
import { calculateSessionPricing } from "@/lib/mentor/pricing";
import { onMentorSessionBooked } from "@/lib/mentor/notifications";

const bodySchema = z.object({
  scheduledAt: z.string().datetime(),
  duration: z.coerce.number().int().min(30).max(120).default(60),
  topic: z.string().min(1).max(200).default("Career guidance"),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const tier = (session.user.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "mentor_sessions")) {
    return NextResponse.json({ success: false, error: "Premium required" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const { mentorId } = await ctx.params;
  const prisma = getPrisma();
  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, isApproved: true, isActive: true },
    select: {
      id: true,
      hourlyRate: true,
      userId: true,
      user: { select: { name: true } },
    },
  });
  if (!mentor || !mentor.hourlyRate) {
    return NextResponse.json({ success: false, error: "Mentor not found" }, { status: 404 });
  }
  if (mentor.userId === session.user.id) {
    return NextResponse.json({ success: false, error: "Cannot book yourself" }, { status: 400 });
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt.getTime() < Date.now() + 60 * 60 * 1000) {
    return NextResponse.json(
      { success: false, error: "Sessions must be scheduled at least 1 hour ahead" },
      { status: 400 },
    );
  }

  const { price, platformFee, mentorEarning } = calculateSessionPricing(
    mentor.hourlyRate,
    parsed.data.duration,
  );

  const row = await prisma.mentorSession.create({
    data: {
      mentorId: mentor.id,
      menteeId: session.user.id,
      status: SessionStatus.PENDING,
      topic: parsed.data.topic,
      duration: parsed.data.duration,
      scheduledAt,
      price,
      platformFee,
      mentorEarning,
    },
    select: { id: true, scheduledAt: true },
  });

  const mentee = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  await onMentorSessionBooked({
    mentorUserId: mentor.userId,
    menteeUserId: session.user.id,
    mentorName: mentor.user.name ?? "Mentor",
    menteeName: mentee?.name ?? "Candidate",
    scheduledAt,
  });

  return NextResponse.json({ success: true, data: row }, { status: 201 });
}
