import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { getOpenAI } from "@/lib/ai/openai";

export const runtime = "nodejs";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
});

const outputSchema = z.object({
  bullets: z.array(z.string().min(2)).min(3).max(10),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<z.infer<typeof outputSchema>>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_enhance_bullets")) {
    return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const openai = getOpenAI();
  try {
    const prompt =
      "Rewrite this work experience description into 4-7 strong bullet points.\n" +
      "- Start each bullet with an action verb\n" +
      "- Quantify impact when possible\n" +
      "- Keep each bullet under 2 lines\n" +
      "Return ONLY JSON: {bullets:[string]}.\n\n" +
      `Role: ${parsed.data.title}\n` +
      `Company: ${parsed.data.company}\n` +
      `Description: ${parsed.data.description}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      messages: [
        { role: "system", content: "Return JSON only. No markdown. No extra keys." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(content) as unknown;
    const out = outputSchema.safeParse(json);
    if (!out.success) {
      return NextResponse.json({ success: false, error: "AI output validation failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: out.data });
  } catch {
    return NextResponse.json({ success: false, error: "AI request failed" }, { status: 502 });
  }
}

