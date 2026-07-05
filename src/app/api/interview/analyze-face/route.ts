import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { fetchClaudeVisionJsonText } from "@/lib/ai/claude-vision-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import {
  facialAnalysisApiSchema,
  facialSnapshotSchema,
  type FacialSnapshot,
} from "@/lib/interview/facial-analysis-types";

const visionResultSchema = facialSnapshotSchema.omit({ timestamp: true, questionNumber: true });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
      return NextResponse.json({ error: "Unauthorized", snapshot: null }, { status: 401 });
    }

    const raw: unknown = await request.json().catch(() => null);
    const parsed = facialAnalysisApiSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ snapshot: null }, { status: 400 });
    }

    const prisma = getPrisma();
    const interview = await prisma.videoInterview.findFirst({
      where: {
        id: parsed.data.interviewId,
        userId: session.user.id,
        status: InterviewStatus.IN_PROGRESS,
      },
      select: { id: true },
    });

    if (!interview) {
      return NextResponse.json({ snapshot: null }, { status: 404 });
    }

    const claude = await fetchClaudeVisionJsonText({
      system: "You output a single JSON object only. No markdown fences.",
      userText: `You are an expert behavioral psychologist analyzing a job interview candidate's facial expressions.

Analyze this candidate's face and return ONLY a JSON object:

{
  "confidence": 1-10,
  "stress": 1-10,
  "engagement": 1-10,
  "authenticity": 1-10,
  "primaryEmotion": "confident|nervous|calm|uncertain|focused|distressed|happy|neutral",
  "eyeContact": "strong|moderate|weak|avoiding",
  "posture": "upright|slouched|leaning-forward|leaning-back",
  "microExpressions": ["list of 1-3 brief observations"],
  "overallImpression": "one sentence professional observation"
}

Be objective and professional. Base analysis ONLY on what is visible. Return ONLY valid JSON.`,
      imageBase64: parsed.data.imageBase64,
      mediaType: "image/jpeg",
      maxTokens: 512,
    });

    if (!claude.ok) {
      return NextResponse.json({ snapshot: null }, { status: 200 });
    }

    let facialData: z.infer<typeof visionResultSchema>;
    try {
      const json = parseJsonFromModel(claude.text);
      const validated = visionResultSchema.safeParse(json);
      if (!validated.success) {
        return NextResponse.json({ snapshot: null }, { status: 200 });
      }
      facialData = validated.data;
    } catch {
      return NextResponse.json({ snapshot: null }, { status: 200 });
    }

    const snapshot: FacialSnapshot = {
      timestamp: parsed.data.timestamp,
      questionNumber: parsed.data.questionNumber,
      ...facialData,
    };

    await prisma.interviewFacialSnapshot.create({
      data: {
        videoInterviewId: interview.id,
        timestamp: new Date(parsed.data.timestamp),
        questionNumber: parsed.data.questionNumber,
        confidence: facialData.confidence,
        stress: facialData.stress,
        engagement: facialData.engagement,
        authenticity: facialData.authenticity,
        primaryEmotion: facialData.primaryEmotion,
        eyeContact: facialData.eyeContact,
        posture: facialData.posture,
        microExpressions: facialData.microExpressions,
        overallImpression: facialData.overallImpression,
      },
    });

    return NextResponse.json({ snapshot }, { status: 200 });
  } catch {
    return NextResponse.json({ snapshot: null }, { status: 200 });
  }
}
