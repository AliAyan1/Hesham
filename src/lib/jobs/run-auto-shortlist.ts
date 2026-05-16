import { z } from "zod";
import { AssessmentStatus, NotificationType, UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { createUserNotification } from "@/lib/notifications/create-user-notification";

const rowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  totalScore: z.number().int().min(0).max(100),
  recommendation: z.string(),
  matchNote: z.string(),
});

const packSchema = z.object({
  shortlist: z.array(rowSchema).min(1).max(20),
});

/**
 * After a job is posted, score registered candidates who have completed assessments
 * and persist an AI shortlist for the employer dashboard.
 */
export async function runAutoShortlistForJob(jobId: string, employerId: string): Promise<void> {
  const prisma = getPrisma();

  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId },
    select: { id: true, title: true, description: true, category: true, skills: true },
  });
  if (!job) return;

  const seekers = await prisma.user.findMany({
    where: {
      role: UserRole.JOBSEEKER,
      assessments: {
        some: {
          status: AssessmentStatus.COMPLETED,
          isFlagged: false,
          totalScore: { gte: 50 },
        },
      },
    },
    take: 120,
    select: {
      id: true,
      name: true,
      email: true,
      cv: {
        select: {
          professionalTitle: true,
          summary: true,
          skills: true,
        },
      },
      assessments: {
        where: { status: AssessmentStatus.COMPLETED, isFlagged: false, totalScore: { gte: 50 } },
        orderBy: { totalScore: "desc" },
        take: 1,
        select: { totalScore: true, type: true },
      },
    },
  });

  const candidatesPayload = seekers
    .filter((s) => s.assessments[0]?.totalScore != null)
    .map((s) => ({
      userId: s.id,
      name: s.name?.trim() || s.email.split("@")[0] || "Candidate",
      title: s.cv?.professionalTitle ?? "",
      summary: (s.cv?.summary ?? "").slice(0, 400),
      skills: s.cv?.skills,
      assessmentScore: s.assessments[0]?.totalScore ?? 0,
      assessmentType: s.assessments[0]?.type ?? "GENERAL",
    }));

  if (candidatesPayload.length === 0) {
    await prisma.jobAutoShortlist.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, entries: [] as object[] },
      update: { entries: [] as object[] },
    });
    return;
  }

  const prompt =
    `You are an expert recruiter. Job:\nTitle: ${job.title}\nCategory: ${job.category}\n` +
    `Description excerpt:\n${job.description.slice(0, 4000)}\n\n` +
    `Candidates (JSON):\n${JSON.stringify(candidatesPayload).slice(0, 28000)}\n\n` +
    `Pick the best 8–15 candidates for this role (not every job needs all). ` +
    `Return ONLY JSON: {"shortlist":[{"userId":"","name":"","totalScore":0-100,"recommendation":"","matchNote":""}]} ` +
    `totalScore should reflect fit for THIS job (you may differ slightly from input assessmentScore).`;

  const claude = await fetchClaudeJsonText({
    system: "You output a single JSON object only. No markdown.",
    user: prompt,
    maxTokens: 6000,
  });

  let entries: z.infer<typeof packSchema>["shortlist"] = [];
  if (claude.ok) {
    try {
      const json = parseJsonFromModel(claude.text);
      const v = packSchema.safeParse(json);
      if (v.success) entries = v.data.shortlist;
    } catch {
      entries = [];
    }
  }

  if (entries.length === 0) {
    const fallback = candidatesPayload
      .sort((a, b) => b.assessmentScore - a.assessmentScore)
      .slice(0, 12)
      .map((c) => ({
        userId: c.userId,
        name: c.name,
        totalScore: c.assessmentScore,
        recommendation: "Strong assessment match — review profile.",
        matchNote: "Auto-ranked by assessment score.",
      }));
    entries = fallback;
  }

  await prisma.jobAutoShortlist.upsert({
    where: { jobId: job.id },
    create: { jobId: job.id, entries: entries as object[] },
    update: { entries: entries as object[] },
  });

  await createUserNotification({
    userId: employerId,
    type: NotificationType.SHORTLIST_READY,
    title: "AI shortlist ready",
    titleAr: "قائمة المرشحين المقترحة جاهزة",
    message: `An AI shortlist is ready for your job: ${job.title}.`,
    messageAr: `قائمة مقترحة جاهزة لوظيفة: ${job.title}.`,
    link: `/dashboard/employer/jobs/${job.id}/shortlist`,
  });
}
