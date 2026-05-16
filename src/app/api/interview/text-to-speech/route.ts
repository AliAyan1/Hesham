import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getOpenAI } from "@/lib/ai/openai";
import { hasAccess } from "@/lib/subscription";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";

const bodySchema = z.object({
  text: z.string().min(1).max(8000),
  locale: z.string().max(8).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
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

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  let openai: ReturnType<typeof getOpenAI>;
  try {
    openai = getOpenAI();
  } catch {
    return NextResponse.json({ success: false, error: "OpenAI not configured" } satisfies ApiResponse<never>, {
      status: 503,
    });
  }

  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: parsed.data.text,
    });
    const buf = Buffer.from(await speech.arrayBuffer());
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "TTS failed" }, { status: 502 });
  }
}
