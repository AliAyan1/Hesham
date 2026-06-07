import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { onMentorRejected } from "@/lib/mentor/notifications";
import { requireAdminApi } from "@/lib/admin/require-admin";

const bodySchema = z.object({
  reason: z.string().min(3).max(2000),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

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

  await logAudit({
    userId: session.user.id,
    action: "ADMIN_MENTOR_REJECT",
    entity: "Mentor",
    entityId: mentor.id,
    newData: { rejectedReason: parsed.data.reason },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
