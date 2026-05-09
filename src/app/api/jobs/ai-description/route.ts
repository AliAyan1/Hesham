import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { getOpenAI } from "@/lib/ai/openai";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { jobCategorySchema, jobTypeSchema } from "@/lib/jobs/constants";

const bodySchema = z.object({
  title: z.string().min(3).max(200),
  category: jobCategorySchema,
  type: jobTypeSchema,
  location: z.string().max(200).optional(),
});

const outSchema = z.object({
  description: z.string().min(80).max(12000),
  descriptionAr: z.string().max(12000),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ description: string; descriptionAr: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (userRow?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_job_description")) {
    return NextResponse.json(
      { success: false, error: "Professional or Premium required for AI job descriptions" },
      { status: 403 },
    );
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
    return NextResponse.json({ success: false, error: "AI not configured" }, { status: 503 });
  }

  const b = parsed.data;
  const prompt =
    `Write a professional job description in English (~200–300 words) and a fluent Arabic translation of the full description.` +
    ` Return ONLY JSON shaped as {\"description\":\"...\",\"descriptionAr\":\"...\"} with no markdown.\n\n` +
    `Role: ${b.title}\nCategory: ${b.category}\nType: ${b.type}\nLocation: ${b.location ?? "Not specified"}\n`;

  try {
    const model = process.env.OPENAI_JD_MODEL?.trim() || "gpt-4o";
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.35,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You draft inclusive, bias-aware job postings. Output one JSON object only with keys description (English) and descriptionAr (Arabic).",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const json: unknown = parseJsonFromModel(text);
    const out = outSchema.safeParse(json);
    if (!out.success) {
      return NextResponse.json({ success: false, error: "AI format invalid" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: { description: out.data.description, descriptionAr: out.data.descriptionAr },
    });
  } catch {
    return NextResponse.json({ success: false, error: "AI failed" }, { status: 502 });
  }
}
