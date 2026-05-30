import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const uid = session.user.id;
  const isMentor = session.user.role === UserRole.MENTOR;

  const sessions = await prisma.mentorSession.findMany({
    where: isMentor
      ? { mentor: { userId: uid }, status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } }
      : { menteeId: uid, status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messageThread: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
        },
      },
      mentor: { include: { user: { select: { id: true, name: true, image: true, role: true } } } },
      mentee: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  const threads = sessions
    .filter((s) => s.messageThread)
    .map((s) => {
      const otherRaw = isMentor ? s.mentee : s.mentor.user;
      const other = sanitizeUserForPublic(otherRaw);
      const last = s.messageThread?.messages[0];
      return {
        id: s.messageThread!.id,
        sessionId: s.id,
        otherUserId: other.id,
        otherName: other.name ?? "User",
        otherImage: other.image,
        lastBody: last?.body ?? "",
        lastAt: (last?.createdAt ?? s.updatedAt).toISOString(),
      };
    });

  return NextResponse.json({ success: true, data: { threads } });
}
