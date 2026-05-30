import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import SessionRoomClient from "@/components/session/SessionRoomClient";

export default async function SessionRoomPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { locale, sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/login`);

  const prisma = getPrisma();
  const row = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: { mentor: { select: { userId: true } } },
  });

  if (!row) redirect(`/${locale}/dashboard`);

  const isMentor = row.mentor.userId === session.user.id;
  const isMentee = row.menteeId === session.user.id;
  if (!isMentor && !isMentee) redirect(`/${locale}/dashboard`);

  return <SessionRoomClient sessionId={sessionId} />;
}
