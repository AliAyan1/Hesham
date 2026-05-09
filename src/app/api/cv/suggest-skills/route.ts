import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { getOpenAI } from "@/lib/ai/openai";

export const runtime = "nodejs";

const bodySchema = z.object({
  professionalTitle: z.string().min(1).max(200),
});

const outputSchema = z.object({
  skills: z.array(z.string().min(2)).min(5).max(20),
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
  if (!hasAccess(tier, "ai_skill_suggestions")) {
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
      "Suggest top skills for this job title. Mix technical + soft skills, ATS-friendly keywords.\n" +
      "Return ONLY JSON: {skills:[string]}.\n" +
      `Title: ${parsed.data.professionalTitle}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.6,
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

