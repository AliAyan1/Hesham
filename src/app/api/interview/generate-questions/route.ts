import { NextResponse, type NextRequest } from "next/server";
import { InterviewStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { hasAccess } from "@/lib/subscription";
import { getProctoringSuspensionPayload } from "@/lib/assessment/check-proctoring-suspension";
import type { ApiResponse, SubscriptionTier } from "@/types";

const bodySchema = z.object({
  kind: z.enum(["practice", "competency", "job"]),
  jobId: z.string().optional(),
  interviewId: z.string().optional(),
});

const qSchema = z.object({
  id: z.string(),
  question: z.string(),
  questionAr: z.string(),
  category: z.string(),
  timeLimit: z.number().int().min(30).max(600),
  tips: z.string(),
});

const packSchema = z.object({
  questions: z.array(qSchema).min(4).max(10),
});

/** Employer templates may have fewer questions than AI-generated packs. */
const storedPackSchema = z.object({
  questions: z.array(qSchema).min(1).max(25),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ interviewId: string; questions: z.infer<typeof qSchema>[] }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true, dataConsentInterviewAt: true },
  });
  const tier = (userRow?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_assessment")) {
    return NextResponse.json({ success: false, error: "Professional or Premium required" }, { status: 403 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const userId = session.user.id;

  const suspension = await getProctoringSuspensionPayload(userId);
  if (suspension) {
    return NextResponse.json(
      { success: false, error: suspension.error, cooldownUntil: suspension.cooldownUntil },
      { status: 403 },
    );
  }

  if (parsed.data.interviewId) {
    const existing = await prisma.videoInterview.findFirst({
      where: {
        id: parsed.data.interviewId,
        userId,
        status: InterviewStatus.IN_PROGRESS,
      },
      select: { id: true, questions: true },
    });
    if (!existing || !existing.questions) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }
    const questionsUnknown = existing.questions as unknown;
    const v = storedPackSchema.safeParse({ questions: questionsUnknown });
    if (!v.success) {
      return NextResponse.json({ success: false, error: "Stored questions invalid" }, { status: 500 });
    }
    return NextResponse.json(
      { success: true, data: { interviewId: existing.id, questions: v.data.questions } },
      { status: 200 },
    );
  }

  /** Employer flow: applications create `PENDING` interviews with questions — start them here. */
  if (parsed.data.kind === "job" && parsed.data.jobId) {
    const jobIv = await prisma.videoInterview.findFirst({
      where: {
        userId,
        jobId: parsed.data.jobId,
        interviewKind: "job",
        status: { in: [InterviewStatus.PENDING, InterviewStatus.IN_PROGRESS] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, questions: true, status: true },
    });
    if (jobIv?.questions) {
      const questionsUnknown = jobIv.questions as unknown;
      const v = storedPackSchema.safeParse({ questions: questionsUnknown });
      if (v.success) {
        if (jobIv.status === InterviewStatus.PENDING) {
          await prisma.videoInterview.update({
            where: { id: jobIv.id },
            data: { status: InterviewStatus.IN_PROGRESS, startedAt: new Date() },
          });
        }
        return NextResponse.json(
          { success: true, data: { interviewId: jobIv.id, questions: v.data.questions } },
          { status: 200 },
        );
      }
    }
  }

  const inProgress = await prisma.videoInterview.findFirst({
    where: {
      userId,
      status: InterviewStatus.IN_PROGRESS,
      interviewKind: parsed.data.kind,
      ...(parsed.data.kind === "job" && parsed.data.jobId ? { jobId: parsed.data.jobId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, questions: true },
  });
  if (inProgress?.questions) {
    const questionsUnknown = inProgress.questions as unknown;
    const v = storedPackSchema.safeParse({ questions: questionsUnknown });
    if (v.success) {
      return NextResponse.json(
        { success: true, data: { interviewId: inProgress.id, questions: v.data.questions } },
        { status: 200 },
      );
    }
  }

  if (!userRow?.dataConsentInterviewAt) {
    return NextResponse.json({ success: false, error: "consent_required" }, { status: 403 });
  }

  const cv = await prisma.cV.findUnique({ where: { userId: session.user.id } });
  const job =
    parsed.data.kind === "job" && parsed.data.jobId
      ? await prisma.job.findFirst({
          where: { id: parsed.data.jobId, isActive: true },
          select: { title: true, description: true, category: true },
        })
      : null;

  const role = cv?.professionalTitle ?? "Professional";
  const prompt =
    `Generate 5–7 professional interview questions for a ${parsed.data.kind} interview.\n` +
    `Candidate target role: ${role}.\n` +
    (job
      ? `Job context — title: ${job.title}, category: ${job.category}, description excerpt: ${job.description.slice(0, 2000)}\n`
      : "") +
    `Return ONLY JSON: {"questions":[{"id":"string","question":"","questionAr":"","category":"","timeLimit":120,"tips":""}]}`;

  const claude = await fetchClaudeJsonText({
    system:
      "You output a single JSON object only. No markdown. Questions must be fair and professional.",
    user: prompt,
    maxTokens: 6000,
  });

  if (!claude.ok) {
    return NextResponse.json({ success: false, error: "AI unavailable" }, { status: 503 });
  }

  let pack: z.infer<typeof packSchema>;
  try {
    const json = parseJsonFromModel(claude.text);
    const v = packSchema.safeParse(json);
    if (!v.success) {
      return NextResponse.json({ success: false, error: "Invalid AI shape" }, { status: 502 });
    }
    pack = v.data;
  } catch {
    return NextResponse.json({ success: false, error: "Parse error" }, { status: 502 });
  }

  const created = await prisma.videoInterview.create({
    data: {
      userId,
      interviewKind: parsed.data.kind,
      jobId: parsed.data.jobId ?? null,
      status: InterviewStatus.IN_PROGRESS,
      questions: pack.questions as object[],
      startedAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json(
    { success: true, data: { interviewId: created.id, questions: pack.questions } },
    { status: 201 },
  );
}
