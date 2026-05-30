import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ mentorId: string }> },
): Promise<NextResponse> {
  const { mentorId } = await ctx.params;
  const prisma = getPrisma();
  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, isApproved: true, isActive: true },
    include: {
      user: { select: { name: true, image: true } },
      availability: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
      certifications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!mentor) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { mentor } });
}
