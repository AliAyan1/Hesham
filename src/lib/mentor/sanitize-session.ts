import { sanitizeUserForPublic } from "@/lib/sanitize-user";
import type { MentorSession, User } from "@prisma/client";

type SessionWithUsers = MentorSession & {
  mentor?: { user: Pick<User, "id" | "name" | "image" | "role"> };
  mentee?: Pick<User, "id" | "name" | "image" | "role">;
};

export type SafeMentorSession = Omit<
  MentorSession,
  "dailyRoomUrl" | "recordingUrl" | "recordingId"
> & {
  mentor?: { user: ReturnType<typeof sanitizeUserForPublic> };
  mentee?: ReturnType<typeof sanitizeUserForPublic>;
  canJoin: boolean;
  joinOpensAt: string | null;
  otherParty: ReturnType<typeof sanitizeUserForPublic> | null;
};

const JOIN_WINDOW_MS = 5 * 60 * 1000;

export function sanitizeMentorSession(
  row: SessionWithUsers,
  viewerUserId: string,
): SafeMentorSession {
  const {
    dailyRoomUrl: _url,
    recordingUrl: _recUrl,
    recordingId: _recId,
    mentor,
    mentee,
    ...rest
  } = row;

  const isMentor = mentor?.user.id === viewerUserId;
  const isMentee = mentee?.id === viewerUserId;
  const other = isMentor ? mentee : isMentee ? mentor?.user : null;

  const scheduledMs = rest.scheduledAt?.getTime() ?? 0;
  const joinOpensAt = rest.scheduledAt
    ? new Date(scheduledMs - JOIN_WINDOW_MS).toISOString()
    : null;
  const canJoin =
    Boolean(rest.dailyRoomName) &&
    (rest.status === "CONFIRMED" || rest.status === "IN_PROGRESS") &&
    Boolean(rest.scheduledAt) &&
    Date.now() >= scheduledMs - JOIN_WINDOW_MS;

  return {
    ...rest,
    scheduledAt: rest.scheduledAt,
    startedAt: rest.startedAt,
    endedAt: rest.endedAt,
    reviewedAt: rest.reviewedAt,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
    mentor: mentor ? { user: sanitizeUserForPublic(mentor.user) } : undefined,
    mentee: mentee ? sanitizeUserForPublic(mentee) : undefined,
    otherParty: other ? sanitizeUserForPublic(other) : null,
    canJoin,
    joinOpensAt,
  };
}
