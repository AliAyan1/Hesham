import type { MentorSession, User } from "@prisma/client";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

const JOIN_WINDOW_MS = 5 * 60 * 1000;

type SessionRow = MentorSession & {
  mentor?: { user: Pick<User, "id" | "name" | "image" | "role"> };
  mentee?: Pick<User, "id" | "name" | "image" | "role">;
};

export type MentorSessionListItem = {
  id: string;
  status: string;
  duration: number;
  topic: string | null;
  notes: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  price: number;
  mentorEarning: number;
  rating: number | null;
  review: string | null;
  canJoin: boolean;
  joinOpensAt: string | null;
  startsInMinutes: number | null;
  mentor?: { user: ReturnType<typeof sanitizeUserForPublic> };
  mentee?: ReturnType<typeof sanitizeUserForPublic>;
};

export function toMentorSessionListItem(
  row: SessionRow,
  viewerUserId: string,
): MentorSessionListItem {
  const scheduledMs = row.scheduledAt?.getTime() ?? 0;
  const joinOpensAt = row.scheduledAt
    ? new Date(scheduledMs - JOIN_WINDOW_MS).toISOString()
    : null;
  const canJoin =
    Boolean(row.dailyRoomName) &&
    (row.status === "CONFIRMED" || row.status === "IN_PROGRESS") &&
    Boolean(row.scheduledAt) &&
    Date.now() >= scheduledMs - JOIN_WINDOW_MS;

  let startsInMinutes: number | null = null;
  if (row.scheduledAt && !canJoin && row.status === "CONFIRMED") {
    const diff = scheduledMs - JOIN_WINDOW_MS - Date.now();
    if (diff > 0) startsInMinutes = Math.ceil(diff / 60000);
  }

  return {
    id: row.id,
    status: row.status,
    duration: row.duration,
    topic: row.topic,
    notes: row.notes,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    price: row.price,
    mentorEarning: row.mentorEarning,
    rating: row.rating,
    review: row.review,
    canJoin,
    joinOpensAt,
    startsInMinutes,
    mentor: row.mentor ? { user: sanitizeUserForPublic(row.mentor.user) } : undefined,
    mentee: row.mentee ? sanitizeUserForPublic(row.mentee) : undefined,
  };
}
