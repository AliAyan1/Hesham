import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { NotificationType } from "@prisma/client";
import { getSessionForParticipant } from "@/lib/mentor/session-access";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const access = await getSessionForParticipant(parsed.data.sessionId, authSession.user.id);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  if (
    access.session.status === SessionStatus.COMPLETED ||
    access.session.status === SessionStatus.CANCELLED
  ) {
    return NextResponse.json({ success: true, data: { ok: true } });
  }

  const prisma = getPrisma();

  try {
    const mentorSession = await prisma.mentorSession.update({
      where: { id: access.session.id },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
      },
      include: {
        mentor: { include: { user: { select: { id: true, name: true } } } },
        mentee: { select: { id: true, name: true } },
      },
    });

    await prisma.mentor.update({
      where: { id: mentorSession.mentorId },
      data: {
        totalSessions: { increment: 1 },
        pendingPayout: { increment: mentorSession.mentorEarning },
        totalEarnings: { increment: mentorSession.mentorEarning },
      },
    });

    const mentorName = mentorSession.mentor.user.name ?? "Mentor";

    await createUserNotification({
      userId: mentorSession.menteeId,
      type: NotificationType.SESSION_COMPLETE,
      title: "Session complete!",
      titleAr: "اكتملت الجلسة!",
      message: `Rate your session with ${mentorName}.`,
      messageAr: `قيّم جلستك مع ${mentorName}.`,
      link: `/session/${mentorSession.id}/complete`,
    });

    await createUserNotification({
      userId: mentorSession.mentor.user.id,
      type: NotificationType.SESSION_COMPLETE,
      title: "Session complete!",
      titleAr: "اكتملت الجلسة!",
      message: `SAR ${Math.round(mentorSession.mentorEarning)} added to pending payout.`,
      messageAr: `أُضيف ${Math.round(mentorSession.mentorEarning)} ريال إلى المبلغ المعلق.`,
      link: "/dashboard/mentor/earnings",
    });

    return NextResponse.json({ success: true, data: { ok: true } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to end session" }, { status: 500 });
  }
}
