import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { fetchClaudeVisionJsonText } from "@/lib/ai/claude-vision-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  sessionId: z.string(),
  imageBase64: z.string().min(20).max(6_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const visionSchema = z.object({
  faceVisible: z.boolean(),
  multipleFaces: z.boolean(),
  lookingAway: z.boolean(),
  suspiciousActivity: z.boolean(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<z.infer<typeof visionSchema>>>> {
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
  const row = await prisma.proctoringSession.findFirst({
    where: { id: parsed.data.sessionId, userId: session.user.id },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
  }

  const claude = await fetchClaudeVisionJsonText({
    system: "You output a single JSON object only. No markdown.",
    userText:
      "Analyze this webcam frame from a proctored assessment. Return ONLY JSON: " +
      '{"faceVisible":boolean,"multipleFaces":boolean,"lookingAway":boolean,"suspiciousActivity":boolean}',
    imageBase64: parsed.data.imageBase64,
    mediaType: parsed.data.mediaType,
    maxTokens: 400,
  });

  if (!claude.ok) {
    return NextResponse.json({ success: false, error: "Vision unavailable" }, { status: 503 });
  }

  try {
    const json = parseJsonFromModel(claude.text);
    const v = visionSchema.safeParse(json);
    if (!v.success) {
      return NextResponse.json({ success: false, error: "Invalid vision response" }, { status: 502 });
    }
    return NextResponse.json({ success: true, data: v.data }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Parse error" }, { status: 502 });
  }
}
