import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  kind: z.enum(["assessment", "interview"]),
  id: z.string(),
  share: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const userId = session.user.id;

  if (parsed.data.kind === "assessment") {
    const n = await prisma.assessment.updateMany({
      where: { id: parsed.data.id, userId },
      data: { shareWithEmployers: parsed.data.share },
    });
    if (n.count === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
  } else {
    const n = await prisma.videoInterview.updateMany({
      where: { id: parsed.data.id, userId },
      data: { shareWithEmployers: parsed.data.share },
    });
    if (n.count === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
}
