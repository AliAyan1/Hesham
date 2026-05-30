import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

const patchSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ success: true, data: { mentor } });
  } catch {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
}
