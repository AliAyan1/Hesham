import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { toMentorSessionListItem } from "@/lib/mentor/session-list-item";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const rows = await prisma.mentorSession.findMany({
    where: { menteeId: session.user.id },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      mentor: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true, role: true } },
        },
      },
    },
  });

  const items = rows.map((r) => toMentorSessionListItem(r, session.user.id));

  return NextResponse.json({ success: true, data: { sessions: items } });
}
