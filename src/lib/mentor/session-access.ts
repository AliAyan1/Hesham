import { SessionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export async function getSessionForParticipant(
  sessionId: string,
  userId: string,
): Promise<
  | {
      ok: true;
      session: {
        id: string;
        mentorId: string;
        menteeId: string;
        mentorUserId: string;
        status: SessionStatus;
        duration: number;
        dailyRoomName: string | null;
        scheduledAt: Date | null;
        mentorEarning: number;
      };
    }
  | { ok: false; status: number; error: string }
> {
  const prisma = getPrisma();
  const row = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: { mentor: { select: { userId: true } } },
  });

  if (!row) {
    return { ok: false, status: 404, error: "Session not found" };
  }

  const isMentor = row.mentor.userId === userId;
  const isMentee = row.menteeId === userId;
  if (!isMentor && !isMentee) {
    return { ok: false, status: 403, error: "Not authorized for this session" };
  }

  return {
    ok: true,
    session: {
      id: row.id,
      mentorId: row.mentorId,
      menteeId: row.menteeId,
      mentorUserId: row.mentor.userId,
      status: row.status,
      duration: row.duration,
      dailyRoomName: row.dailyRoomName,
      scheduledAt: row.scheduledAt,
      mentorEarning: row.mentorEarning,
    },
  };
}

export async function ensureMentorMessageThread(sessionId: string): Promise<string> {
  const prisma = getPrisma();
  const existing = await prisma.mentorMessageThread.findUnique({
    where: { mentorSessionId: sessionId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.mentorMessageThread.create({
    data: { mentorSessionId: sessionId },
    select: { id: true },
  });
  return created.id;
}
