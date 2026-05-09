import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { APIError } from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { getAnthropic } from "@/lib/ai/anthropic";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { claudeMessageModelCandidates } from "@/lib/ai/claude-model-candidates";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const analysisSchema = z.object({
  totalScore: z.number().min(0).max(100),
  formatScore: z.number().min(0).max(25),
  keywordsScore: z.number().min(0).max(25),
  experienceScore: z.number().min(0).max(25),
  skillsScore: z.number().min(0).max(25),
  issues: z
    .array(
      z.object({
        type: z.enum(["critical", "warning", "good"]),
        message: z.string().min(1),
        messageAr: z.string().min(1),
        fix: z.string().nullable(),
      }),
    )
    .default([]),
  missingKeywords: z.array(z.string()).default([]),
  presentKeywords: z.array(z.string()).default([]),
  suggestions: z
    .array(
      z.object({
        section: z.string().min(1),
        suggestion: z.string().min(1),
        suggestionAr: z.string().min(1),
      }),
    )
    .default([]),
  overallFeedback: z.string().min(1),
  overallFeedbackAr: z.string().min(1),
});

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function POST(): Promise<
  NextResponse<ApiResponse<{ analysis: z.infer<typeof analysisSchema> }>>
> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const [user, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    }),
    prisma.cV.findUnique({ where: { userId: session.user.id } }),
  ]);

  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ats_score")) {
    return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 });
  }
  if (!cv) {
    return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 });
  }

  let anthropic: ReturnType<typeof getAnthropic>;
  try {
    anthropic = getAnthropic();
  } catch {
    return NextResponse.json(
      { success: false, error: "ATS analysis is not configured (missing API key)." },
      { status: 503 },
    );
  }

  const prompt =
    "Analyze this CV as an ATS expert. Return ONLY JSON with this exact shape:\n" +
    "{totalScore:number,formatScore:number(0-25),keywordsScore:number(0-25),experienceScore:number(0-25),skillsScore:number(0-25)," +
    "issues:[{type:'critical'|'warning'|'good',message:string,messageAr:string,fix:string|null}]," +
    "missingKeywords:string[],presentKeywords:string[]," +
    "suggestions:[{section:string,suggestion:string,suggestionAr:string}]," +
    "overallFeedback:string,overallFeedbackAr:string}\n\n" +
    "CV JSON:\n" +
    JSON.stringify(
      {
        fullName: cv.fullName,
        professionalTitle: cv.professionalTitle,
        email: cv.email,
        phone: cv.phone,
        location: cv.location,
        linkedinUrl: cv.linkedinUrl,
        portfolioUrl: cv.portfolioUrl,
        summary: cv.summary,
        experience: cv.experience,
        education: cv.education,
        skills: cv.skills,
        languages: cv.languages,
        certifications: cv.certifications,
      },
      null,
      2,
    );

  try {
    const candidates = claudeMessageModelCandidates();
    let msg: Message | undefined;

    for (const model of candidates) {
      try {
        msg = await anthropic.messages.create({
          model,
          max_tokens: 8192,
          temperature: 0.2,
          stream: false,
          system: "You are a strict JSON generator. Output one JSON object only. No markdown, no code fences, no commentary.",
          messages: [{ role: "user", content: prompt }],
        });
        break;
      } catch (e) {
        if (e instanceof APIError && e.status === 404) {
          console.warn("[cv/ats-score] Claude model returned 404, trying next:", model);
          continue;
        }
        throw e;
      }
    }

    if (!msg) {
      return NextResponse.json(
        {
          success: false,
          error: `No Claude model available for ATS. Tried: ${candidates.join(", ")}. Set ANTHROPIC_ATS_MODEL in .env to a comma-separated list of model IDs from your Anthropic dashboard.`,
        },
        { status: 400 },
      );
    }

    const text =
      msg.content
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("")
        .trim() ?? "";

    if (!text) {
      console.error("[cv/ats-score] Empty model response", { stopReason: msg.stop_reason });
      return NextResponse.json(
        { success: false, error: "ATS analysis returned no content" },
        { status: 502 },
      );
    }

    let json: unknown;
    try {
      json = parseJsonFromModel(text);
    } catch (parseErr) {
      console.error("[cv/ats-score] JSON parse failed", parseErr, text.slice(0, 500));
      return NextResponse.json(
        { success: false, error: "ATS analysis response was not valid JSON" },
        { status: 502 },
      );
    }

    const parsed = analysisSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[cv/ats-score] Zod validation failed", parsed.error.flatten(), json);
      return NextResponse.json(
        { success: false, error: "AI output validation failed" },
        { status: 502 },
      );
    }

    await prisma.cV.update({
      where: { userId: session.user.id },
      data: {
        atsScore: Math.round(parsed.data.totalScore),
        atsAnalysis: toInputJson(parsed.data),
        atsKeywords: toInputJson({
          missing: parsed.data.missingKeywords,
          present: parsed.data.presentKeywords,
        }),
        atsSuggestions: toInputJson(parsed.data.suggestions),
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, data: { analysis: parsed.data } });
  } catch (e) {
    console.error("[cv/ats-score]", e);
    return NextResponse.json(
      { success: false, error: "ATS analysis failed" },
      { status: 502 },
    );
  }
}

