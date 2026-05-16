import { AssessmentStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { applyProctoringSuspension } from "@/lib/assessment/apply-proctoring-suspension";
import { PROCTORING_MAX_WARNINGS } from "@/lib/assessment/proctoring-policy";
import { notifyEmployersAboutJobSeeker } from "@/lib/assessment/notify-employers";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  assessmentId: z.string(),
  flagReason: z.string().max(2000).optional(),
  proctoringFlags: z.record(z.string(), z.unknown()).optional(),
  warningCount: z.number().int().min(1).max(PROCTORING_MAX_WARNINGS).optional(),
  violationKind: z.string().max(64).optional(),
});

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{ ok: true; cooldownUntil: string; talentPoolAdded: boolean }>
  >
> {
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
  const row = await prisma.assessment.findFirst({
    where: {
      id: parsed.data.assessmentId,
      userId: session.user.id,
      status: AssessmentStatus.IN_PROGRESS,
    },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const warningCount = parsed.data.warningCount ?? PROCTORING_MAX_WARNINGS;
  const violationSummary =
    parsed.data.flagReason ??
    `Proctoring policy violation (${parsed.data.violationKind ?? "multiple"})`;

  const { cooldownUntil, talentPoolAdded } = await applyProctoringSuspension({
    userId: session.user.id,
    userName: session.user.name ?? null,
    assessmentId: row.id,
    violationSummary,
    warningCount,
    proctoringFlags: (parsed.data.proctoringFlags ?? {}) as Record<string, unknown>,
  });

  const userName = session.user.name ?? null;
  await notifyEmployersAboutJobSeeker({
    jobSeekerId: session.user.id,
    jobSeekerName: userName,
    title: "{name}'s assessment was flagged ⚠️",
    titleAr: "تم الإبلاغ عن تقييم المرشح",
    message: "{name}'s assessment was flagged after repeated proctoring violations.",
    messageAr: "تم الإبلاغ عن تقييم المرشح بسبب مخالفات المراقبة.",
    linkPath: "/dashboard/employer/candidates",
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        ok: true,
        cooldownUntil: cooldownUntil.toISOString(),
        talentPoolAdded,
      },
    },
    { status: 200 },
  );
}
