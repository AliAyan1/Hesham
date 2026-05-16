import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  scope: z.enum(["assessment", "interview"]),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ recordedAt: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const now = new Date();
  const prisma = getPrisma();
  if (parsed.data.scope === "assessment") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { dataConsentAssessmentAt: now },
    });
  } else {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { dataConsentInterviewAt: now },
    });
  }

  return NextResponse.json(
    { success: true, data: { recordedAt: now.toISOString() } },
    { status: 200 },
  );
}
