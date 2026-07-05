import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import type { SubscriptionTier as Tier } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { hasAccess } from "@/lib/subscription";
import { getOpenAI } from "@/lib/ai/openai";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import {
  computeProfilePageCompletionFromRecords,
  MIN_PROFILE_COMPLETION_FOR_AI_JOB_MATCH,
} from "@/lib/profile-page-completion";

const qpSchema = z.object({
  /** Omit or pass 0 to return every active job from all employers. */
  limit: z.coerce.number().int().min(0).max(200).optional(),
});

const AI_MATCH_CANDIDATE_CAP = 50;
const AI_MATCH_RESULT_CAP = 10;

type PrefsShape = {
  preferredCategories?: string[];
  desiredJobTitle?: string;
};

const matchRowSchema = z.object({
  jobId: z.string(),
  score: z.number().min(0).max(100),
  reason: z.string().max(600),
});

const matchRowsSchema = z.array(matchRowSchema).max(AI_MATCH_RESULT_CAP);

type JobRow = {
  id: string;
  title: string;
  category: string;
  description: string;
  type: string;
  location: string | null;
  createdAt: Date;
};

type Item = {
  jobId: string;
  title: string;
  category: string;
  matchScore: number | null;
  reason: string | null;
  aiPowered: boolean;
};

function itemsWithoutScores(source: JobRow[]): Item[] {
  return source.map((j) => ({
    jobId: j.id,
    title: j.title,
    category: j.category,
    matchScore: null,
    reason: null,
    aiPowered: false,
  }));
}

function sortJobItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.matchScore != null && b.matchScore != null) return b.matchScore - a.matchScore;
    if (a.matchScore != null) return -1;
    if (b.matchScore != null) return 1;
    return 0;
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = qpSchema.safeParse({
    limit: rawLimit === null || rawLimit === "" ? undefined : rawLimit,
  });
  const limit =
    parsedLimit.success && parsedLimit.data.limit != null && parsedLimit.data.limit > 0
      ? parsedLimit.data.limit
      : null;

  const prisma = getPrisma();
  const userId = session.user.id;

  const [userRow, cv, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, name: true, image: true },
    }),
    prisma.cV.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);

  const profileCompletionPct = computeProfilePageCompletionFromRecords({
    hasProfilePhoto: Boolean(userRow?.image),
    name: userRow?.name ?? null,
    profile,
    cv,
  });

  const tier = (userRow?.subscriptionTier ?? "FREE") as Tier;
  const prefs = (profile?.jobPreferences ?? null) as PrefsShape | null;

  /** Every active job from any employer — no plan or category filter. */
  const jobs = await prisma.job.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      type: true,
      location: true,
      createdAt: true,
    },
  });

  const canRunAi =
    hasAccess(tier, "job_matching_ai") &&
    profileCompletionPct >= MIN_PROFILE_COMPLETION_FOR_AI_JOB_MATCH;

  if (!canRunAi) {
    const items = itemsWithoutScores(jobs);
    return NextResponse.json(
      {
        success: true,
        data: {
          items: limit != null ? items.slice(0, limit) : items,
          total: jobs.length,
        },
      },
      { status: 200 },
    );
  }

  let openai: ReturnType<typeof getOpenAI>;
  try {
    openai = getOpenAI();
  } catch {
    const items = itemsWithoutScores(jobs);
    return NextResponse.json(
      {
        success: true,
        data: {
          items: limit != null ? items.slice(0, limit) : items,
          total: jobs.length,
        },
      },
      { status: 200 },
    );
  }

  const profileBlob = {
    prefs,
    headline: cv?.professionalTitle ?? null,
    summary: cv?.summary?.slice(0, 1200) ?? null,
    skills: cv?.skills,
    titles: cv?.experience,
  };

  const jobsForAi = jobs.slice(0, AI_MATCH_CANDIDATE_CAP);
  const jobSummaries = jobsForAi.map((j) => ({
    id: j.id,
    title: j.title,
    category: j.category,
    snippet: j.description.slice(0, 400),
    type: j.type,
    location: j.location,
  }));

  const prompt =
    "Given candidate profile JSON and job list JSON, return ONLY JSON array of up to " +
    String(AI_MATCH_RESULT_CAP) +
    ' objects {\"jobId\":string,\"score\":number 0-100,\"reason\":string briefly why it fits} ranked best first.' +
    "\n\nPROFILE:\n" +
    JSON.stringify(profileBlob).slice(0, 14000) +
    "\n\nJOBS:\n" +
    JSON.stringify(jobSummaries).slice(0, 14000);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_JOB_MATCH_MODEL?.trim() || "gpt-4o",
      temperature: 0.2,
      max_completion_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You match resumes to postings conservatively — only output JSON {\"matches\":[...]} with the array sorted by descending score.",
        },
        { role: "user", content: prompt },
      ],
    });

    const rawText = completion.choices[0]?.message?.content?.trim() ?? "";
    const blob: unknown = parseJsonFromModel(rawText);
    const matchesRaw: unknown = Array.isArray(blob)
      ? blob
      : blob && typeof blob === "object" && "matches" in blob
        ? (blob as { matches: unknown }).matches
        : [];
    const rows = matchRowsSchema.safeParse(matchesRaw);

    const scoreByJobId = new Map<string, { score: number; reason: string }>();
    if (rows.success) {
      for (const row of rows.data) {
        scoreByJobId.set(row.jobId, { score: Math.round(row.score), reason: row.reason });
      }
    }

    let items: Item[] = jobs.map((j) => {
      const match = scoreByJobId.get(j.id);
      if (!match) {
        return {
          jobId: j.id,
          title: j.title,
          category: j.category,
          matchScore: null,
          reason: null,
          aiPowered: false,
        };
      }
      return {
        jobId: j.id,
        title: j.title,
        category: j.category,
        matchScore: match.score,
        reason: match.reason,
        aiPowered: true,
      };
    });

    items = sortJobItems(items);

    return NextResponse.json(
      {
        success: true,
        data: {
          items: limit != null ? items.slice(0, limit) : items,
          total: jobs.length,
        },
      },
      { status: 200 },
    );
  } catch {
    const items = itemsWithoutScores(jobs);
    return NextResponse.json(
      {
        success: true,
        data: {
          items: limit != null ? items.slice(0, limit) : items,
          total: jobs.length,
        },
      },
      { status: 200 },
    );
  }
}
