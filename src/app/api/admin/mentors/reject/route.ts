import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/require-admin";

const bodySchema = z.object({
  mentorId: z.string().min(1),
  reason: z.string().min(3).max(500),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const mentor = await prisma.mentor.update({
    where: { id: parsed.data.mentorId },
    data: {
      isApproved: false,
      isActive: false,
      rejectedReason: parsed.data.reason.trim(),
    },
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
