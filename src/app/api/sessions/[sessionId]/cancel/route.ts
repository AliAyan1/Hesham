import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { getSessionForParticipant } from "@/lib/mentor/session-access";

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await ctx.params;
  const access = await getSessionForParticipant(sessionId, authSession.user.id);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { session } = access;
  if (session.status !== SessionStatus.PENDING && session.status !== SessionStatus.CONFIRMED) {
    return NextResponse.json({ success: false, error: "Cannot cancel this session" }, { status: 400 });
  }

  const scheduledMs = session.scheduledAt?.getTime() ?? 0;
  if (scheduledMs && Date.now() > scheduledMs - CANCEL_WINDOW_MS) {
    return NextResponse.json(
      { success: false, error: "Cancellation must be at least 24 hours before the session" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.CANCELLED },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
