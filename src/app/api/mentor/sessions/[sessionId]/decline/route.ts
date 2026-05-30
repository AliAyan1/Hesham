import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { sessionId } = await ctx.params;
  const prisma = getPrisma();

  const updated = await prisma.mentorSession.updateMany({
    where: {
      id: sessionId,
      mentorId: auth.ctx.mentorId,
      status: SessionStatus.PENDING,
    },
    data: { status: SessionStatus.CANCELLED },
  });

  if (updated.count === 0) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { ok: true } });
}
