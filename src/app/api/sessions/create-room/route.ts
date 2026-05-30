import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { createDailyRoomForSession } from "@/lib/daily/client";
import { getSessionForParticipant } from "@/lib/mentor/session-access";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const access = await getSessionForParticipant(parsed.data.sessionId, session.user.id);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  if (access.session.status !== SessionStatus.CONFIRMED && access.session.status !== SessionStatus.IN_PROGRESS) {
    return NextResponse.json({ success: false, error: "Session not ready for room" }, { status: 400 });
  }

  if (access.session.dailyRoomName) {
    return NextResponse.json({ success: true, data: { ok: true } });
  }

  try {
    const room = await createDailyRoomForSession(access.session.id, access.session.duration);
    const prisma = getPrisma();
    await prisma.mentorSession.update({
      where: { id: access.session.id },
      data: { dailyRoomName: room.roomName, dailyRoomUrl: room.roomUrl },
    });
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create room" }, { status: 500 });
  }
}
