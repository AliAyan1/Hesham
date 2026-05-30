import { NotificationType, SessionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;
/** Cron should run every 5 minutes; windows are ±5 min around target offsets. */
const WINDOW_MS = 5 * 60 * 1000;

export type SessionReminderCronResult = {
  oneHour: number;
  fifteenMin: number;
};

async function notifyParticipant(params: {
  userId: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  link: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: NotificationType.SESSION_REMINDER,
    title: params.title,
    titleAr: params.titleAr,
    message: params.message,
    messageAr: params.messageAr,
    link: params.link,
  });
}

export async function runSessionReminderCron(): Promise<SessionReminderCronResult> {
  const prisma = getPrisma();
  const now = Date.now();

  const oneHourFrom = new Date(now + ONE_HOUR_MS - WINDOW_MS);
  const oneHourTo = new Date(now + ONE_HOUR_MS + WINDOW_MS);
  const fifteenFrom = new Date(now + FIFTEEN_MIN_MS - WINDOW_MS);
  const fifteenTo = new Date(now + FIFTEEN_MIN_MS + WINDOW_MS);

  const [oneHourSessions, fifteenSessions] = await Promise.all([
    prisma.mentorSession.findMany({
      where: {
        status: SessionStatus.CONFIRMED,
        scheduledAt: { gte: oneHourFrom, lte: oneHourTo },
        reminderOneHourSentAt: null,
      },
      include: {
        mentor: { include: { user: { select: { id: true, name: true } } } },
        mentee: { select: { id: true, name: true } },
      },
    }),
    prisma.mentorSession.findMany({
      where: {
        status: { in: [SessionStatus.CONFIRMED, SessionStatus.IN_PROGRESS] },
        scheduledAt: { gte: fifteenFrom, lte: fifteenTo },
        reminderFifteenMinSentAt: null,
      },
      include: {
        mentor: { include: { user: { select: { id: true, name: true } } } },
        mentee: { select: { id: true, name: true } },
      },
    }),
  ]);

  let oneHour = 0;
  for (const s of oneHourSessions) {
    if (!s.scheduledAt) continue;
    const when = s.scheduledAt.toLocaleString("en-GB");
    const mentorName = s.mentor.user.name ?? "Mentor";
    const menteeName = s.mentee.name ?? "Candidate";

    await notifyParticipant({
      userId: s.menteeId,
      title: "Session in 1 hour",
      titleAr: "جلستك بعد ساعة",
      message: `Your session with ${mentorName} starts in 1 hour (${when}).`,
      messageAr: `جلستك مع ${mentorName} بعد ساعة (${when}).`,
      link: "/dashboard/job-seeker/sessions",
    });
    await notifyParticipant({
      userId: s.mentor.user.id,
      title: "Session in 1 hour",
      titleAr: "جلستك بعد ساعة",
      message: `Your session with ${menteeName} starts in 1 hour (${when}).`,
      messageAr: `جلستك مع ${menteeName} بعد ساعة (${when}).`,
      link: "/dashboard/mentor/sessions",
    });

    await prisma.mentorSession.update({
      where: { id: s.id },
      data: { reminderOneHourSentAt: new Date() },
    });
    oneHour += 1;
  }

  let fifteenMin = 0;
  for (const s of fifteenSessions) {
    if (!s.scheduledAt) continue;
    const mentorName = s.mentor.user.name ?? "Mentor";
    const menteeName = s.mentee.name ?? "Candidate";

    await notifyParticipant({
      userId: s.menteeId,
      title: "Session starts in 15 minutes",
      titleAr: "الجلسة بعد 15 دقيقة",
      message: `Session starts in 15 minutes! Go to your sessions page to join with ${mentorName}.`,
      messageAr: `تبدأ الجلسة بعد 15 دقيقة! انضم من صفحة الجلسات مع ${mentorName}.`,
      link: "/dashboard/job-seeker/sessions",
    });
    await notifyParticipant({
      userId: s.mentor.user.id,
      title: "Session starts in 15 minutes",
      titleAr: "الجلسة بعد 15 دقيقة",
      message: `Session starts in 15 minutes! Go to your sessions page to join with ${menteeName}.`,
      messageAr: `تبدأ الجلسة بعد 15 دقيقة! انضم من صفحة الجلسات مع ${menteeName}.`,
      link: "/dashboard/mentor/sessions",
    });

    await prisma.mentorSession.update({
      where: { id: s.id },
      data: { reminderFifteenMinSentAt: new Date() },
    });
    fifteenMin += 1;
  }

  return { oneHour, fifteenMin };
}
