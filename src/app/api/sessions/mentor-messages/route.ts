import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { containsContactInfo, MESSAGE_FILTER_ERROR } from "@/lib/message-filter";
import { getSessionForParticipant, ensureMentorMessageThread } from "@/lib/mentor/session-access";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

const postSchema = z.object({
  sessionId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId required" }, { status: 400 });
  }

  const access = await getSessionForParticipant(sessionId, authSession.user.id);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  if (
    access.session.status !== SessionStatus.CONFIRMED &&
    access.session.status !== SessionStatus.IN_PROGRESS &&
    access.session.status !== SessionStatus.COMPLETED
  ) {
    return NextResponse.json({ success: false, error: "Messaging not available" }, { status: 403 });
  }

  const prisma = getPrisma();
  const threadId = await ensureMentorMessageThread(sessionId);
  const messages = await prisma.mentorMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true, image: true, role: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        isMine: m.senderId === authSession.user.id,
        sender: sanitizeUserForPublic(m.sender),
      })),
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const body = parsed.data.body.trim();
  if (containsContactInfo(body)) {
    return NextResponse.json({ success: false, error: MESSAGE_FILTER_ERROR }, { status: 400 });
  }

  const access = await getSessionForParticipant(parsed.data.sessionId, authSession.user.id);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  if (
    access.session.status !== SessionStatus.CONFIRMED &&
    access.session.status !== SessionStatus.IN_PROGRESS
  ) {
    return NextResponse.json({ success: false, error: "Messaging not available" }, { status: 403 });
  }

  const prisma = getPrisma();
  const threadId = await ensureMentorMessageThread(parsed.data.sessionId);

  const msg = await prisma.mentorMessage.create({
    data: {
      threadId,
      senderId: authSession.user.id,
      body,
    },
    select: { id: true, createdAt: true },
  });

  await prisma.mentorMessageThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    data: { id: msg.id, createdAt: msg.createdAt.toISOString() },
  });
}
