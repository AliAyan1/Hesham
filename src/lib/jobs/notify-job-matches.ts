import { AssessmentStatus, NotificationType, UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { onJobMatchNotify } from "@/lib/email-triggers";

type PrefsShape = {
  preferredCategories?: string[];
  desiredJobTitle?: string;
};

function skillLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string" && x.trim()) return x.trim().toLowerCase();
      if (x && typeof x === "object" && "name" in x && typeof (x as { name: unknown }).name === "string") {
        return (x as { name: string }).name.trim().toLowerCase();
      }
      return "";
    })
    .filter(Boolean);
}

function computeMatchPercent(
  job: { category: string; skills: unknown },
  seeker: { prefs: PrefsShape | null; cvSkills: unknown },
): number {
  let score = 45;
  const cats = seeker.prefs?.preferredCategories?.filter(Boolean) ?? [];
  if (cats.length === 0 || cats.includes(job.category)) score += 25;

  const jobSkills = skillLabels(job.skills);
  const cvSkills = skillLabels(seeker.cvSkills);
  if (jobSkills.length && cvSkills.length) {
    const overlap = jobSkills.filter((s) => cvSkills.some((c) => c.includes(s) || s.includes(c))).length;
    score += Math.min(30, Math.round((overlap / jobSkills.length) * 30));
  } else if (seeker.prefs?.desiredJobTitle?.trim()) {
    score += 10;
  }

  return Math.min(98, Math.max(55, score));
}

/**
 * Notify job seekers with a strong heuristic match when a job is published.
 */
export async function notifyJobSeekersOnNewJob(jobId: string): Promise<void> {
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: {
      id: true,
      title: true,
      category: true,
      skills: true,
      employer: {
        select: {
          name: true,
          employerProfile: { select: { companyName: true } },
        },
      },
    },
  });
  if (!job) return;

  const company =
    job.employer.employerProfile?.companyName?.trim() ||
    job.employer.name?.trim() ||
    "Employer";

  const jobLink = `/dashboard/job-seeker/jobs/${job.id}`;
  const alreadyNotified = await prisma.notification.findMany({
    where: {
      type: NotificationType.JOB_MATCH,
      link: jobLink,
    },
    select: { userId: true },
    take: 500,
  });
  const skipIds = new Set(alreadyNotified.map((n) => n.userId));

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
    take: 200,
    select: {
      id: true,
      email: true,
      profile: { select: { jobPreferences: true } },
      cv: { select: { skills: true } },
    },
  });

  const ranked = seekers
    .filter((s) => !skipIds.has(s.id))
    .map((s) => {
      const prefs = (s.profile?.jobPreferences ?? null) as PrefsShape | null;
      const matchPercent = computeMatchPercent(job, { prefs, cvSkills: s.cv?.skills });
      return { ...s, matchPercent, prefs };
    })
    .filter((s) => {
      const cats = s.prefs?.preferredCategories?.filter(Boolean) ?? [];
      if (cats.length > 0 && !cats.includes(job.category)) return false;
      return s.matchPercent >= 60;
    })
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 25);

  for (const s of ranked) {
    if (!s.email) continue;
    void onJobMatchNotify({
      userId: s.id,
      email: s.email,
      jobId: job.id,
      jobTitle: job.title,
      company,
      matchPercent: s.matchPercent,
    });
  }
}
