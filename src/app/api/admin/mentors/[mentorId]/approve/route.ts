import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { onMentorApproved } from "@/lib/mentor/notifications";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { mentorId } = await ctx.params;
  const prisma = getPrisma();

  const mentor = await prisma.mentor.update({
    where: { id: mentorId },
    data: {
      isApproved: true,
      isActive: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      rejectedReason: null,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  await onMentorApproved({
    userId: mentor.user.id,
    email: mentor.user.email,
    name: mentor.user.name ?? "Mentor",
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
