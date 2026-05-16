import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
): Promise<
  NextResponse<
    ApiResponse<{
      messages: Array<{ id: string; senderId: string; body: string; createdAt: string }>;
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
}
