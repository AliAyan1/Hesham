import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { createDailyMeetingToken, dailyDomain } from "@/lib/daily/client";
import { getSessionForParticipant } from "@/lib/mentor/session-access";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

const JOIN_WINDOW_MS = 5 * 60 * 1000;

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

  const { session } = access;
  if (!session.dailyRoomName) {
    return NextResponse.json({ success: false, error: "Room not ready" }, { status: 400 });
  }

  if (session.status !== SessionStatus.CONFIRMED && session.status !== SessionStatus.IN_PROGRESS) {
    return NextResponse.json({ success: false, error: "Session cannot be joined" }, { status: 400 });
  }

  const scheduledMs = session.scheduledAt?.getTime() ?? 0;
  if (Date.now() < scheduledMs - JOIN_WINDOW_MS) {
    return NextResponse.json({ success: false, error: "Session not open yet" }, { status: 400 });
  }

  const isMentor = session.mentorUserId === authSession.user.id;
  const userName = authSession.user.name?.trim() || "Participant";

  try {
    const token = await createDailyMeetingToken({
      roomName: session.dailyRoomName,
      userName,
      isOwner: isMentor,
      durationMinutes: session.duration,
    });

    const prisma = getPrisma();
    if (session.status === SessionStatus.CONFIRMED) {
      await prisma.mentorSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.IN_PROGRESS, startedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        token,
        roomName: session.dailyRoomName,
        dailyDomain: dailyDomain(),
        duration: session.duration,
        userName,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to join session" }, { status: 500 });
  }
}
