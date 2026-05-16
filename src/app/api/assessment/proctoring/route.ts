import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

const startSchema = z.object({
  action: z.literal("start"),
  assessmentId: z.string().optional(),
  interviewId: z.string().optional(),
});

const patchSchema = z.object({
  action: z.literal("patch"),
  sessionId: z.string(),
  tabSwitches: z.number().int().min(0).optional(),
  faceNotVisible: z.number().int().min(0).optional(),
  multipleFaces: z.number().int().min(0).optional(),
  copyPasteAttempts: z.number().int().min(0).optional(),
  aiToolDetected: z.number().int().min(0).optional(),
  warningCount: z.number().int().min(0).max(99).optional(),
  flags: z.record(z.string(), z.unknown()).optional(),
  isFlagged: z.boolean().optional(),
  severity: z.string().max(120).optional(),
});

const bodySchema = z.discriminatedUnion("action", [startSchema, patchSchema]);

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{ sessionId: string; warningCount: number } | { sessionId: string; warningCount: number }>
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
  const userId = session.user.id;

  if (parsed.data.action === "start") {
    if (!parsed.data.assessmentId && !parsed.data.interviewId) {
      return NextResponse.json(
        { success: false, error: "assessmentId or interviewId required" },
        { status: 400 },
      );
    }
    if (parsed.data.assessmentId) {
      const a = await prisma.assessment.findFirst({
        where: { id: parsed.data.assessmentId, userId },
      });
      if (!a) {
        return NextResponse.json({ success: false, error: "Assessment not found" }, { status: 404 });
      }
    }
    if (parsed.data.interviewId) {
      const v = await prisma.videoInterview.findFirst({
        where: { id: parsed.data.interviewId, userId },
      });
      if (!v) {
        return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
      }
    }
    const created = await prisma.proctoringSession.create({
      data: {
        userId,
        assessmentId: parsed.data.assessmentId ?? null,
        interviewId: parsed.data.interviewId ?? null,
      },
      select: { id: true, warningCount: true },
    });
    return NextResponse.json(
      { success: true, data: { sessionId: created.id, warningCount: created.warningCount } },
      { status: 201 },
    );
  }

  const row = await prisma.proctoringSession.findFirst({
    where: { id: parsed.data.sessionId, userId },
  });
  if (!row) {
    return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
  }

  const nextTab = (parsed.data.tabSwitches ?? 0) + row.tabSwitches;
  const nextFace = (parsed.data.faceNotVisible ?? 0) + row.faceNotVisible;
  const nextMulti = (parsed.data.multipleFaces ?? 0) + row.multipleFaces;
  const nextCopy = (parsed.data.copyPasteAttempts ?? 0) + row.copyPasteAttempts;
  const nextAi = (parsed.data.aiToolDetected ?? 0) + row.aiToolDetected;

  const updated = await prisma.proctoringSession.update({
    where: { id: row.id },
    data: {
      tabSwitches: nextTab,
      faceNotVisible: nextFace,
      multipleFaces: nextMulti,
      copyPasteAttempts: nextCopy,
      aiToolDetected: nextAi,
      warningCount: parsed.data.warningCount ?? row.warningCount,
      flags: parsed.data.flags !== undefined ? (parsed.data.flags as object) : row.flags ?? undefined,
      isFlagged: parsed.data.isFlagged ?? row.isFlagged,
      severity: parsed.data.severity ?? row.severity,
    },
    select: { id: true, warningCount: true },
  });

  return NextResponse.json(
    { success: true, data: { sessionId: updated.id, warningCount: updated.warningCount } },
    { status: 200 },
  );
}
