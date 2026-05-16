import { getPrisma } from "@/lib/db";

export type TalentPoolMatchRow = {
  userId: string;
  name: string | null;
  email: string;
  professionalTitle: string | null;
  assessmentScore: number | null;
  skillsMatched: string[];
  poolReason: string;
};

function parseStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === "string").map((s) => s.trim().toLowerCase());
}

function skillsOverlap(jobSkills: string[], candidateSkills: string[]): string[] {
  const jobSet = new Set(jobSkills.map((s) => s.toLowerCase()));
  return candidateSkills.filter((s) => jobSet.has(s.toLowerCase()));
}

export async function findTalentPoolMatchesForJob(jobId: string): Promise<TalentPoolMatchRow[]> {
  const prisma = getPrisma();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      category: true,
      location: true,
      isRemote: true,
      skills: true,
    },
  });
  if (!job) return [];

  const jobSkills = parseStringArray(job.skills);
  const jobCategory = job.category.trim().toLowerCase();
  const jobLocation = (job.location ?? "").trim().toLowerCase();

  const entries = await prisma.talentPoolEntry.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["userId"],
    take: 300,
    select: {
      userId: true,
      reason: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          inTalentPool: true,
          cv: {
            select: {
              professionalTitle: true,
              skills: true,
              location: true,
            },
          },
          profile: {
            select: { location: true, jobPreferences: true },
          },
          assessments: {
            where: { status: "COMPLETED", isFlagged: false },
            orderBy: { totalScore: "desc" },
            take: 1,
            select: { totalScore: true },
          },
        },
      },
    },
  });

  const matches: TalentPoolMatchRow[] = [];

  for (const entry of entries) {
    if (!entry.user.inTalentPool) continue;

    const cvSkills = parseStringArray(entry.user.cv?.skills);
    const matched = skillsOverlap(jobSkills, cvSkills);
    const prefs = entry.user.profile?.jobPreferences;
    const prefCategories =
      prefs && typeof prefs === "object" && !Array.isArray(prefs)
        ? parseStringArray((prefs as Record<string, unknown>).preferredCategories)
        : [];
    const categoryMatch =
      prefCategories.some((c) => c.includes(jobCategory) || jobCategory.includes(c)) ||
      jobSkills.length === 0 ||
      matched.length > 0;

    if (!categoryMatch && matched.length === 0) continue;

    const candidateLocation = (
      entry.user.cv?.location ??
      entry.user.profile?.location ??
      ""
    )
      .trim()
      .toLowerCase();
    const locationMatch =
      job.isRemote ||
      !jobLocation ||
      !candidateLocation ||
      candidateLocation.includes(jobLocation) ||
      jobLocation.includes(candidateLocation);

    if (!locationMatch && matched.length === 0) continue;

    matches.push({
      userId: entry.userId,
      name: entry.user.name,
      email: entry.user.email,
      professionalTitle: entry.user.cv?.professionalTitle ?? null,
      assessmentScore: entry.user.assessments[0]?.totalScore ?? null,
      skillsMatched: matched.slice(0, 8),
      poolReason: entry.reason,
    });
  }

  return matches.slice(0, 50);
}
