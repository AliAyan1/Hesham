import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { onMentorRejected } from "@/lib/mentor/notifications";

const bodySchema = z.object({
  reason: z.string().min(3).max(2000),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Reason required" }, { status: 400 });
  }

  const { mentorId } = await ctx.params;
  const prisma = getPrisma();

  const mentor = await prisma.mentor.update({
    where: { id: mentorId },
    data: {
      isApproved: false,
      isActive: false,
      rejectedReason: parsed.data.reason,
    },
    include: { user: { select: { id: true, email: true } } },
  });

  await onMentorRejected({
    userId: mentor.user.id,
    email: mentor.user.email,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
