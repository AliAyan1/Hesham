import { SessionStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const mentorId = url.searchParams.get("mentorId")?.trim();

  const prisma = getPrisma();
  const rows = await prisma.mentorSession.findMany({
    where: {
      ...(status && Object.values(SessionStatus).includes(status as SessionStatus)
        ? { status: status as SessionStatus }
        : {}),
      ...(mentorId ? { mentorId } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      mentor: { include: { user: { select: { id: true, name: true, image: true, role: true } } } },
      mentee: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      sessions: rows.map((r) => ({
        id: r.id,
        status: r.status,
        scheduledAt: r.scheduledAt?.toISOString() ?? null,
        duration: r.duration,
        price: r.price,
        mentorEarning: r.mentorEarning,
        hasRecording: Boolean(r.recordingUrl),
        recordingUrl: r.recordingUrl,
        mentor: sanitizeUserForPublic(r.mentor.user),
        mentee: sanitizeUserForPublic(r.mentee),
      })),
    },
  });
}
