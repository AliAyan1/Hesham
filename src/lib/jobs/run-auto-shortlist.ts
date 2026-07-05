import { z } from "zod";
import { AssessmentStatus, InterviewStatus, NotificationType } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import type { ShortlistEntry, ShortlistMatchTier, ShortlistPayload } from "@/lib/jobs/shortlist-types";
import { extractShortlistInsightsFromReport } from "@/lib/interview/shortlist-insights";

const tierSchema = z.enum(["top", "recommended", "partial", "weak"]);

const aiRowSchema = z.object({
  applicationId: z.string(),
  userId: z.string(),
  totalScore: z.number().int().min(0).max(100),
  matchTier: tierSchema,
  recommendation: z.string(),
  matchNote: z.string(),
  aiAnalysis: z.string(),
  strengths: z.array(z.string()).max(8).default([]),
  gaps: z.array(z.string()).max(8).default([]),
});

const packSchema = z.object({
  shortlist: z.array(aiRowSchema).min(1).max(100),
});

type ApplicantBundle = {
  applicationId: string;
  userId: string;
  name: string;
  appliedAt: Date;
  professionalTitle: string;
  cvSummary: string;
  skills: string[];
  experienceYears: number | null;
  assessmentScore: number | null;
  assessmentCompleted: boolean;
  assessmentType: string | null;
  interviewCompleted: boolean;
  interviewScore: number | null;
  interviewKind: string | null;
  applicationMatchScore: number | null;
  enhancedReport: unknown;
};

function enrichEntry(base: Omit<ShortlistEntry, "hiringRecommendation" | "commScore" | "contentScore" | "facialScore" | "fitScore" | "redFlag">, enhancedReport: unknown): ShortlistEntry {
  const insights = extractShortlistInsightsFromReport(enhancedReport);
  return { ...base, ...insights };
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean).slice(0, 12);
}

function tierFromScore(score: number): ShortlistMatchTier {
  if (score >= 85) return "top";
  if (score >= 70) return "recommended";
  if (score >= 50) return "partial";
  return "weak";
}

function fallbackScore(c: ApplicantBundle): number {
  let score = 35;
  if (c.assessmentCompleted && c.assessmentScore != null) {
    score = Math.round(score * 0.35 + c.assessmentScore * 0.45);
  }
  if (c.interviewCompleted && c.interviewScore != null) {
    score = Math.round(score * 0.6 + c.interviewScore * 0.4);
  }
  if (c.professionalTitle.trim()) score += 5;
  if (c.skills.length >= 3) score += 5;
  if (c.cvSummary.length > 80) score += 5;
  return Math.min(100, Math.max(0, score));
}

function buildFallbackEntries(candidates: ApplicantBundle[]): ShortlistEntry[] {
  return candidates
    .map((c) => {
      const totalScore = fallbackScore(c);
      return enrichEntry(
        {
          applicationId: c.applicationId,
          userId: c.userId,
          name: c.name,
          professionalTitle: c.professionalTitle,
          totalScore,
          matchTier: tierFromScore(totalScore),
          recommendation:
            totalScore >= 70
              ? "Recommended for review — solid signals from profile and assessments."
              : totalScore >= 50
                ? "Partial fit — review manually; some requirements may be missing."
                : "Low match — missing assessments, interview, or role alignment.",
          matchNote: "Ranked automatically from CV, assessment, and interview data.",
          aiAnalysis: [
            c.assessmentCompleted
              ? `Assessment completed (${c.assessmentScore ?? "—"}/100).`
              : "Assessment not completed.",
            c.interviewCompleted
              ? `Interview completed (${c.interviewScore ?? "—"}/100).`
              : "Interview not completed.",
            c.professionalTitle ? `Title: ${c.professionalTitle}.` : "No professional title on CV.",
          ].join(" "),
          strengths: [
            ...(c.assessmentCompleted ? [`Assessment score ${c.assessmentScore}/100`] : []),
            ...(c.interviewCompleted ? [`Interview score ${c.interviewScore}/100`] : []),
            ...(c.skills.length ? [`Skills: ${c.skills.slice(0, 5).join(", ")}`] : []),
          ],
          gaps: [
            ...(!c.assessmentCompleted ? ["No completed AI assessment"] : []),
            ...(!c.interviewCompleted ? ["No completed AI interview"] : []),
            ...(!c.cvSummary.trim() ? ["CV summary missing"] : []),
          ],
          assessmentScore: c.assessmentScore,
          assessmentCompleted: c.assessmentCompleted,
          interviewCompleted: c.interviewCompleted,
          interviewScore: c.interviewScore,
          cvSummary: c.cvSummary,
          skills: c.skills,
          appliedAt: c.appliedAt.toISOString(),
          rank: 0,
        },
        c.enhancedReport,
      );
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

async function loadApplicantsForJob(jobId: string, employerId: string): Promise<{
  job: { id: string; title: string; description: string; category: string; skills: unknown } | null;
  candidates: ApplicantBundle[];
}> {
  const prisma = getPrisma();

  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId },
    select: { id: true, title: true, description: true, category: true, skills: true },
  });
  if (!job) return { job: null, candidates: [] };

  const applications = await prisma.application.findMany({
    where: { jobId: job.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      matchScore: true,
      createdAt: true,
      jobSeeker: {
        select: {
          id: true,
          name: true,
          email: true,
          cv: {
            select: {
              professionalTitle: true,
              summary: true,
              skills: true,
              experience: true,
            },
          },
          assessments: {
            where: {
              status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
            },
            orderBy: { totalScore: "desc" },
            take: 1,
            select: { totalScore: true, type: true, status: true },
          },
          videoInterviews: {
            where: {
              OR: [{ jobId: job.id }, { jobId: null }],
              status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
            },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: {
              overallScore: true,
              status: true,
              interviewKind: true,
              jobId: true,
              enhancedReport: true,
            },
          },
        },
      },
    },
  });

  const candidates: ApplicantBundle[] = applications.map((app) => {
    const seeker = app.jobSeeker;
    const assessment = seeker.assessments[0];
    const interview = seeker.videoInterviews[0];
    const exp = seeker.cv?.experience;
    let experienceYears: number | null = null;
    if (Array.isArray(exp) && exp.length > 0) {
      experienceYears = exp.length;
    }

    return {
      applicationId: app.id,
      userId: seeker.id,
      name: seeker.name?.trim() || seeker.email.split("@")[0] || "Candidate",
      appliedAt: app.createdAt,
      professionalTitle: seeker.cv?.professionalTitle?.trim() ?? "",
      cvSummary: (seeker.cv?.summary ?? "").slice(0, 600),
      skills: asStringList(seeker.cv?.skills),
      experienceYears,
      assessmentScore: assessment?.totalScore ?? null,
      assessmentCompleted: assessment?.status === AssessmentStatus.COMPLETED,
      assessmentType: assessment?.type ?? null,
      interviewCompleted: interview?.status === InterviewStatus.COMPLETED,
      interviewScore: interview?.overallScore ?? null,
      interviewKind: interview?.interviewKind ?? null,
      applicationMatchScore: app.matchScore,
      enhancedReport: interview?.enhancedReport ?? null,
    };
  });

  return { job, candidates };
}

function mergeAiWithApplicants(
  aiRows: z.infer<typeof packSchema>["shortlist"],
  candidates: ApplicantBundle[],
): ShortlistEntry[] {
  const byAppId = new Map(candidates.map((c) => [c.applicationId, c]));

  const merged = aiRows
    .filter((row) => byAppId.has(row.applicationId))
    .map((row) => {
      const c = byAppId.get(row.applicationId)!;
      return enrichEntry(
        {
          applicationId: c.applicationId,
          userId: c.userId,
          name: c.name,
          professionalTitle: c.professionalTitle,
          totalScore: row.totalScore,
          matchTier: row.matchTier,
          recommendation: row.recommendation,
          matchNote: row.matchNote,
          aiAnalysis: row.aiAnalysis,
          strengths: row.strengths,
          gaps: row.gaps,
          assessmentScore: c.assessmentScore,
          assessmentCompleted: c.assessmentCompleted,
          interviewCompleted: c.interviewCompleted,
          interviewScore: c.interviewScore,
          cvSummary: c.cvSummary,
          skills: c.skills,
          appliedAt: c.appliedAt.toISOString(),
          rank: 0,
        },
        c.enhancedReport,
      );
    });

  const included = new Set(merged.map((m) => m.applicationId));
  for (const c of candidates) {
    if (included.has(c.applicationId)) continue;
    const totalScore = fallbackScore(c);
    merged.push(
      enrichEntry(
        {
          applicationId: c.applicationId,
          userId: c.userId,
          name: c.name,
          professionalTitle: c.professionalTitle,
          totalScore,
          matchTier: tierFromScore(totalScore),
          recommendation: "Included applicant — not ranked by AI in this pass.",
          matchNote: "Shown because they applied to this job.",
          aiAnalysis: "Pending full AI review.",
          strengths: [],
          gaps: [],
          assessmentScore: c.assessmentScore,
          assessmentCompleted: c.assessmentCompleted,
          interviewCompleted: c.interviewCompleted,
          interviewScore: c.interviewScore,
          cvSummary: c.cvSummary,
          skills: c.skills,
          appliedAt: c.appliedAt.toISOString(),
          rank: 0,
        },
        c.enhancedReport,
      ),
    );
  }

  return merged
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function runAutoShortlistForJob(
  jobId: string,
  employerId: string,
  options?: { notify?: boolean },
): Promise<ShortlistPayload> {
  const prisma = getPrisma();
  const { job, candidates } = await loadApplicantsForJob(jobId, employerId);

  if (!job) {
    return {
      jobId,
      jobTitle: "",
      applicantCount: 0,
      generatedAt: null,
      entries: [],
      aiPowered: false,
    };
  }

  if (candidates.length === 0) {
    await prisma.jobAutoShortlist.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, entries: [] as object[] },
      update: { entries: [] as object[] },
    });
    return {
      jobId: job.id,
      jobTitle: job.title,
      applicantCount: 0,
      generatedAt: new Date().toISOString(),
      entries: [],
      aiPowered: false,
    };
  }

  const claudeInput = candidates.map((c) => ({
    applicationId: c.applicationId,
    userId: c.userId,
    name: c.name,
    title: c.professionalTitle,
    summary: c.cvSummary,
    skills: c.skills,
    experienceYears: c.experienceYears,
    assessmentScore: c.assessmentScore,
    assessmentCompleted: c.assessmentCompleted,
    assessmentType: c.assessmentType,
    interviewCompleted: c.interviewCompleted,
    interviewScore: c.interviewScore,
    interviewKind: c.interviewKind,
    appliedAt: c.appliedAt.toISOString(),
  }));

  const prompt =
    `You are an expert recruiter using Claude. Rank EVERY candidate who applied to this job.\n\n` +
    `JOB:\nTitle: ${job.title}\nCategory: ${job.category}\n` +
    `Required skills (if any): ${JSON.stringify(job.skills ?? [])}\n` +
    `Description:\n${job.description.slice(0, 5000)}\n\n` +
    `APPLICANTS (${candidates.length} total — include ALL in your response):\n` +
    `${JSON.stringify(claudeInput).slice(0, 32000)}\n\n` +
    `For EACH applicant return match analysis. Consider CV, skills, assessment score (if completed), ` +
    `interview score (if completed), and job requirements. ` +
    `matchTier: "top" (85-100, best fit), "recommended" (70-84), "partial" (50-69), "weak" (0-49). ` +
    `Return ONLY JSON:\n` +
    `{"shortlist":[{"applicationId":"","userId":"","totalScore":0-100,"matchTier":"top|recommended|partial|weak",` +
    `"recommendation":"one-line verdict","matchNote":"short fit summary","aiAnalysis":"2-4 sentence detailed spec",` +
    `"strengths":["..."],"gaps":["..."]}]}\n` +
    `Sort by totalScore descending. Include every applicationId from the input.`;

  let entries: ShortlistEntry[] = [];
  let aiPowered = false;

  const claude = await fetchClaudeJsonText({
    system: "You output a single JSON object only. No markdown. Rank all job applicants.",
    user: prompt,
    maxTokens: 8000,
  });

  if (claude.ok) {
    try {
      const json = parseJsonFromModel(claude.text);
      const v = packSchema.safeParse(json);
      if (v.success) {
        entries = mergeAiWithApplicants(v.data.shortlist, candidates);
        aiPowered = true;
      }
    } catch {
      entries = [];
    }
  }

  if (entries.length === 0) {
    entries = buildFallbackEntries(candidates);
  }

  const generatedAt = new Date().toISOString();

  await prisma.jobAutoShortlist.upsert({
    where: { jobId: job.id },
    create: { jobId: job.id, entries: entries as object[] },
    update: { entries: entries as object[] },
  });

  if (options?.notify !== false && entries.length > 0) {
    await createUserNotification({
      userId: employerId,
      type: NotificationType.SHORTLIST_READY,
      title: "AI shortlist ready",
      titleAr: "قائمة المرشحين المقترحة جاهزة",
      message: `AI ranked ${entries.length} applicant(s) for: ${job.title}.`,
      messageAr: `تم ترتيب ${entries.length} مرشحاً بالذكاء الاصطناعي لوظيفة: ${job.title}.`,
      link: `/dashboard/employer/jobs/${job.id}/shortlist`,
    });
  }

  return {
    jobId: job.id,
    jobTitle: job.title,
    applicantCount: candidates.length,
    generatedAt,
    entries,
    aiPowered,
  };
}

export function parseStoredShortlistEntries(raw: unknown): ShortlistEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === "object" && typeof (e as ShortlistEntry).applicationId === "string")
    .map((e) => e as ShortlistEntry);
}

export async function getJobShortlistPayload(
  jobId: string,
  employerId: string,
): Promise<ShortlistPayload | null> {
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId },
    select: { id: true, title: true },
  });
  if (!job) return null;

  const [applicantCount, row] = await Promise.all([
    prisma.application.count({ where: { jobId } }),
    prisma.jobAutoShortlist.findUnique({
      where: { jobId },
      select: { entries: true, updatedAt: true },
    }),
  ]);

  const entries = parseStoredShortlistEntries(row?.entries);

  return {
    jobId: job.id,
    jobTitle: job.title,
    applicantCount,
    generatedAt: row?.updatedAt?.toISOString() ?? null,
    entries,
    aiPowered: entries.some((e) => e.aiAnalysis && !e.aiAnalysis.includes("Pending full AI")),
  };
}
