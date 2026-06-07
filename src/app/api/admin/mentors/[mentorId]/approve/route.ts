import { NextResponse, type NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { onMentorApproved } from "@/lib/mentor/notifications";
import { requireAdminApi } from "@/lib/admin/require-admin";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

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

  await logAudit({
    userId: session.user.id,
    action: "ADMIN_MENTOR_APPROVE",
    entity: "Mentor",
    entityId: mentor.id,
    newData: { isApproved: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
