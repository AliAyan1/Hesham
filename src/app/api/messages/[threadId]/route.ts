import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { NotificationType } from "@prisma/client";
import { containsContactInfo, MESSAGE_FILTER_ERROR } from "@/lib/message-filter";
import {
  canMessageEmployerAndSeeker,
  messagingRoleAllowed,
} from "@/lib/messaging/permissions";
import { runApiRoute } from "@/lib/api/route-handler";

const postSchema = z.object({
  body: z.string().min(1).max(8000),
});

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
): Promise<NextResponse> {
  return runApiRoute("messages/threadId", async () => {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== UserRole.EMPLOYER && role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = await ctx.params;
  const prisma = getPrisma();
  const uid = session.user.id;

  const thread = await prisma.messageThread.findFirst({
    where: {
      id: threadId,
      OR: [{ employerId: uid }, { jobSeekerId: uid }],
    },
    select: { id: true },
  });
  if (!thread) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        messages: rows.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    },
    { status: 200 },
  );
  });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
): Promise<NextResponse> {
  return runApiRoute("messages/threadId/send", async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = session.user.role;
    if (!messagingRoleAllowed(role) || role === UserRole.MENTOR) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { threadId } = await ctx.params;
    const raw: unknown = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
    }

    const body = parsed.data.body.trim();
    if (containsContactInfo(body)) {
      return NextResponse.json({ success: false, error: MESSAGE_FILTER_ERROR }, { status: 400 });
    }

    const prisma = getPrisma();
    const uid = session.user.id;
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        OR: [{ employerId: uid }, { jobSeekerId: uid }],
      },
      select: { id: true, employerId: true, jobSeekerId: true },
    });
    if (!thread) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const allowed = await canMessageEmployerAndSeeker(thread.employerId, thread.jobSeekerId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Messaging is available after shortlisting only" },
        { status: 403 },
      );
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: uid,
        body,
      },
      select: { id: true },
    });

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
      select: { id: true },
    });

    const otherId = uid === thread.employerId ? thread.jobSeekerId : thread.employerId;
    const selfName = session.user.name?.trim() || session.user.email?.split("@")[0] || "User";
    const otherUser = await prisma.user.findUnique({
      where: { id: otherId },
      select: { role: true, email: true },
    });
    const msgLink =
      otherUser?.role === UserRole.EMPLOYER
        ? "/dashboard/employer/messages"
        : "/dashboard/job-seeker/messages";
    await createUserNotification({
      userId: otherId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: "New message",
      titleAr: "رسالة جديدة",
      message: `${selfName} sent you a message on QudrahTech.`,
      messageAr: `${selfName} أرسل لك رسالة.`,
      link: msgLink,
    });

    return NextResponse.json(
      { success: true, data: { messageId: message.id } },
      { status: 201 },
    );
  });
}
