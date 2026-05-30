import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ certificationId: string }> },
): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { certificationId } = await ctx.params;
  const prisma = getPrisma();

  try {
    const row = await prisma.mentorCertification.findFirst({
      where: { id: certificationId, mentorId: auth.ctx.mentorId },
    });
    if (!row) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await prisma.mentorCertification.delete({ where: { id: row.id } });
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch {
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
