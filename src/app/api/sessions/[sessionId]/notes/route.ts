import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { getSessionForParticipant } from "@/lib/mentor/session-access";

const bodySchema = z.object({
  notes: z.string().max(5000),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const { sessionId } = await ctx.params;
  const access = await getSessionForParticipant(sessionId, authSession.user.id);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const prisma = getPrisma();
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: { notes: parsed.data.notes.trim() || null },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
