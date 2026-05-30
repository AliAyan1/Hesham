import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { toFile } from "openai";
import { getServerSession } from "@/lib/get-server-session";
import { getOpenAI } from "@/lib/ai/openai";
import { hasAccess } from "@/lib/subscription";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { getWhisperLanguageCode } from "@/lib/interview/locale-language";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ text: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (userRow?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_assessment")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const locale = typeof form.get("locale") === "string" ? String(form.get("locale")) : "en";
  if (!(file instanceof Blob) || file.size < 10) {
    return NextResponse.json({ success: false, error: "Audio file required" }, { status: 400 });
  }

  let openai: ReturnType<typeof getOpenAI>;
  try {
    openai = getOpenAI();
  } catch {
    return NextResponse.json({ success: false, error: "OpenAI not configured" }, { status: 503 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = "answer.webm";
  const fileObj = await toFile(buf, name, { type: file.type || "audio/webm" });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fileObj,
      model: "whisper-1",
      language: getWhisperLanguageCode(locale),
    });
    const text = transcription.text?.trim() ?? "";
    return NextResponse.json({ success: true, data: { text } }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Transcription failed" }, { status: 502 });
  }
}
