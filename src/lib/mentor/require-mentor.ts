import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

export type MentorContext = {
  userId: string;
  mentorId: string;
  isApproved: boolean;
};

export async function requireMentorUser(): Promise<
  { ok: true; ctx: MentorContext } | { ok: false; status: number; error: string }
> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.MENTOR) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const prisma = getPrisma();
  const mentor = await prisma.mentor.findUnique({
    where: { userId: session.user.id },
    select: { id: true, isApproved: true },
  });
  if (!mentor) {
    return { ok: false, status: 403, error: "Mentor profile not found" };
  }

  return {
    ok: true,
    ctx: {
      userId: session.user.id,
      mentorId: mentor.id,
      isApproved: mentor.isApproved,
    },
  };
}
