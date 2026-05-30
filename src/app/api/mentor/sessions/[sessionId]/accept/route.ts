import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";
import { onMentorSessionConfirmed } from "@/lib/mentor/notifications";
import { createDailyRoomForSession } from "@/lib/daily/client";
import { ensureMentorMessageThread } from "@/lib/mentor/session-access";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { sessionId } = await ctx.params;
  const prisma = getPrisma();

  const row = await prisma.mentorSession.findFirst({
    where: { id: sessionId, mentorId: auth.ctx.mentorId, status: SessionStatus.PENDING },
    include: {
      mentor: { include: { user: { select: { name: true } } } },
      mentee: { select: { id: true, name: true } },
    },
  });
  if (!row || !row.scheduledAt) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  try {
    const room = await createDailyRoomForSession(row.id, row.duration);

    await prisma.mentorSession.update({
      where: { id: row.id },
      data: {
        status: SessionStatus.CONFIRMED,
        dailyRoomName: room.roomName,
        dailyRoomUrl: room.roomUrl,
      },
    });

    await ensureMentorMessageThread(row.id);

    await onMentorSessionConfirmed({
      menteeUserId: row.menteeId,
      mentorName: row.mentor.user.name ?? "Mentor",
      scheduledAt: row.scheduledAt,
      sessionId: row.id,
    });

    return NextResponse.json({ success: true, data: { ok: true, sessionId: row.id } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to confirm session" }, { status: 500 });
  }
}
