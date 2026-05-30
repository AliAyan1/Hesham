import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";
import { toMentorSessionListItem } from "@/lib/mentor/session-list-item";

export async function GET(): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const prisma = getPrisma();
  const sessions = await prisma.mentorSession.findMany({
    where: { mentorId: auth.ctx.mentorId },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      mentee: { select: { id: true, name: true, image: true, email: true, role: true } },
    },
  });

  const mentorUserId = auth.ctx.userId;
  const items = sessions.map((s) => toMentorSessionListItem(s, mentorUserId));

  return NextResponse.json({ success: true, data: { sessions: items } });
}
