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

const ttsCache = new Map<string, Buffer>();
const TTS_CACHE_MAX = 80;

function ttsCacheKey(text: string, locale: string): string {
  return `${locale}::${text}`;
}

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

  const locale = parsed.data.locale ?? "en";
  const cacheKey = ttsCacheKey(parsed.data.text, locale);
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(cached.length),
        "Cache-Control": "private, max-age=3600",
        "X-Tts-Cache": "hit",
      },
    });
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
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: parsed.data.text,
      speed: 1.0,
    });

    const buf = Buffer.from(await mp3.arrayBuffer());
    if (ttsCache.size >= TTS_CACHE_MAX) {
      const first = ttsCache.keys().next().value;
      if (first) ttsCache.delete(first);
    }
    ttsCache.set(cacheKey, buf);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buf.length),
        "Cache-Control": "private, max-age=3600",
        "X-Tts-Cache": "miss",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "Failed to generate voice" }, { status: 500 });
  }
}
