import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { NotificationType } from "@prisma/client";

const postSchema = z.object({
  recipientId: z.string(),
  body: z.string().min(1).max(8000),
});

export async function GET(): Promise<
  NextResponse<
    ApiResponse<{
      threads: Array<{
        id: string;
        otherUserId: string;
        otherName: string | null;
        lastBody: string;
        lastAt: string;
      }>;
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== UserRole.EMPLOYER && role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const prisma = getPrisma();
  const uid = session.user.id;

  const threads = await prisma.messageThread.findMany({
    where: role === UserRole.EMPLOYER ? { employerId: uid } : { jobSeekerId: uid },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      employer: { select: { id: true, name: true, email: true } },
      jobSeeker: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true },
      },
    },
  });

  const out = threads.map((t) => {
    const isEm = role === UserRole.EMPLOYER;
    const other = isEm ? t.jobSeeker : t.employer;
    const last = t.messages[0];
    return {
      id: t.id,
      otherUserId: other.id,
      otherName: other.name?.trim() || other.email.split("@")[0] || "User",
      lastBody: last?.body ?? "",
      lastAt: (last?.createdAt ?? t.updatedAt).toISOString(),
    };
  });

  return NextResponse.json({ success: true, data: { threads: out } }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ threadId: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== UserRole.EMPLOYER && role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const recipient = await prisma.user.findUnique({
    where: { id: parsed.data.recipientId },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!recipient) {
    return NextResponse.json({ success: false, error: "Recipient not found" }, { status: 404 });
  }

  let employerId: string;
  let jobSeekerId: string;
  if (role === UserRole.EMPLOYER) {
    if (recipient.role !== UserRole.JOBSEEKER) {
      return NextResponse.json({ success: false, error: "Invalid recipient" }, { status: 400 });
    }
    employerId = session.user.id;
    jobSeekerId = recipient.id;
  } else {
    if (recipient.role !== UserRole.EMPLOYER) {
      return NextResponse.json({ success: false, error: "Invalid recipient" }, { status: 400 });
    }
    jobSeekerId = session.user.id;
    employerId = recipient.id;
  }

  const thread = await prisma.messageThread.upsert({
    where: {
      employerId_jobSeekerId: { employerId, jobSeekerId },
    },
    create: { employerId, jobSeekerId },
    update: {},
    select: { id: true },
  });

  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: session.user.id,
      body: parsed.data.body.trim(),
    },
    select: { id: true },
  });

  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
    select: { id: true },
  });

  const otherId = session.user.id === employerId ? jobSeekerId : employerId;
  const selfName = session.user.name?.trim() || session.user.email?.split("@")[0] || "User";
  const otherUser = await prisma.user.findUnique({
    where: { id: otherId },
    select: { role: true },
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

  return NextResponse.json({ success: true, data: { threadId: thread.id } }, { status: 201 });
}
