import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { sanitizeMentorSession } from "@/lib/mentor/sanitize-session";
import { getSessionForParticipant } from "@/lib/mentor/session-access";

export async function GET(
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

  const prisma = getPrisma();
  const row = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: {
      mentor: { include: { user: { select: { id: true, name: true, image: true, email: true, role: true } } } },
      mentee: { select: { id: true, name: true, image: true, email: true, role: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { session: sanitizeMentorSession(row, authSession.user.id) },
  });
}
