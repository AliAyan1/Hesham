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
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});

type PrefsShape = {
  preferredCategories?: string[];
  desiredJobTitle?: string;
};

const matchRowSchema = z.object({
  jobId: z.string(),
  score: z.number().min(0).max(100),
  reason: z.string().max(600),
});

const matchRowsSchema = z.array(matchRowSchema).max(10);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedLimit = qpSchema.safeParse({
    limit: url.searchParams.get("limit"),
  });
  const limit = parsedLimit.success ? parsedLimit.data.limit : 5;

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
  const categories = prefs?.preferredCategories?.filter(Boolean) ?? [];

  const jobs = await prisma.job.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      type: true,
      location: true,
    },
  });

  type Item = {
    jobId: string;
    title: string;
    category: string;
    matchScore: number | null;
    reason: string | null;
    aiPowered: boolean;
  };

  function itemsWithoutScores(source: typeof jobs): Item[] {
    return source.slice(0, limit).map((j) => ({
      jobId: j.id,
      title: j.title,
      category: j.category,
      matchScore: null,
      reason: null,
      aiPowered: false,
    }));
  }

  if (!hasAccess(tier, "job_matching_ai")) {
    const filtered =
      categories.length === 0
        ? jobs
        : jobs.filter((j) => categories.includes(j.category));

    return NextResponse.json(
      { success: true, data: { items: itemsWithoutScores(filtered) } },
      { status: 200 },
    );
  }

  if (profileCompletionPct < MIN_PROFILE_COMPLETION_FOR_AI_JOB_MATCH) {
    return NextResponse.json(
      { success: true, data: { items: itemsWithoutScores(jobs) } },
      { status: 200 },
    );
  }

  let openai: ReturnType<typeof getOpenAI>;
  try {
    openai = getOpenAI();
  } catch {
    return NextResponse.json(
      { success: true, data: { items: itemsWithoutScores(jobs) } },
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

  const jobSummaries = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    category: j.category,
    snippet: j.description.slice(0, 400),
    type: j.type,
    location: j.location,
  }));

  const prompt =
    "Given candidate profile JSON and job list JSON, return ONLY JSON array of up to " +
    String(limit) +
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

    const byId = new Map(jobs.map((j) => [j.id, j]));

    let items: Item[] = [];

    if (rows.success && rows.data.length) {
      items = rows.data
        .filter((row) => byId.has(row.jobId))
        .slice(0, limit)
        .map((row) => {
          const j = byId.get(row.jobId)!;
          return {
            jobId: row.jobId,
            title: j.title,
            category: j.category,
            matchScore: Math.round(row.score),
            reason: row.reason,
            aiPowered: true,
          };
        });
    }

    if (!items.length) {
      items = itemsWithoutScores(jobs);
    }

    return NextResponse.json({ success: true, data: { items } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: true, data: { items: itemsWithoutScores(jobs) } },
      { status: 200 },
    );
  }
}
