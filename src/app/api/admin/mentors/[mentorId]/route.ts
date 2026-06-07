import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/require-admin";

const patchSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const { mentorId } = await ctx.params;
  const prisma = getPrisma();

  try {
    const mentor = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive: parsed.data.isActive },
      select: { id: true, isActive: true },
    });

    await logAudit({
      userId: session.user.id,
      action: "ADMIN_MENTOR_UPDATE",
      entity: "Mentor",
      entityId: mentor.id,
      newData: { isActive: mentor.isActive },
    });

    return NextResponse.json({ success: true, data: { mentor } });
  } catch {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
}
