import { AssessmentStatus, InterviewStatus, TalentPoolReason, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { isProctoringSuspended } from "@/lib/assessment/proctoring-policy";

const qpSchema = z.object({
  minAssessment: z.coerce.number().int().min(0).max(100).optional(),
  maxAssessment: z.coerce.number().int().min(0).max(100).optional(),
  minInterview: z.coerce.number().int().min(0).max(100).optional(),
  maxInterview: z.coerce.number().int().min(0).max(100).optional(),
  skillsContains: z.string().max(80).optional(),
  reason: z.nativeEnum(TalentPoolReason).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function skillLabels(skills: unknown): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills
      .map((x) => {
        if (typeof x === "string") return x.trim();
        if (x && typeof x === "object" && "name" in x && typeof (x as { name: unknown }).name === "string") {
          return (x as { name: string }).name.trim();
        }
        return "";
      })
      .filter(Boolean)
      .slice(0, 24);
  }
  return [];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = qpSchema.safeParse({
    minAssessment: url.searchParams.get("minAssessment") ?? undefined,
    maxAssessment: url.searchParams.get("maxAssessment") ?? undefined,
    minInterview: url.searchParams.get("minInterview") ?? undefined,
    maxInterview: url.searchParams.get("maxInterview") ?? undefined,
    skillsContains: url.searchParams.get("skills") ?? undefined,
    reason: url.searchParams.get("reason") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const f = parsed.success ? parsed.data : {};

  const prisma = getPrisma();

  const entries = await prisma.talentPoolEntry.findMany({
    where: {
      ...(f.reason ? { reason: f.reason } : {}),
      ...(f.from || f.to
        ? {
            createdAt: {
              ...(f.from ? { gte: new Date(f.from) } : {}),
              ...(f.to ? { lte: new Date(f.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          proctoringSuspendedUntil: true,
          inTalentPool: true,
          profile: { select: { location: true } },
          cv: {
            select: {
              professionalTitle: true,
              skills: true,
            },
          },
          assessments: {
            where: { status: AssessmentStatus.COMPLETED, isFlagged: false },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { totalScore: true },
          },
          videoInterviews: {
            where: { status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] } },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { overallScore: true },
          },
        },
      },
    },
  });

  const skillNeedle = f.skillsContains?.trim().toLowerCase();

  const rows = entries
    .filter((e) => e.user.inTalentPool)
    .map((e) => {
      const a = e.user.assessments[0]?.totalScore ?? null;
      const iv = e.user.videoInterviews[0]?.overallScore ?? null;
      const labels = skillLabels(e.user.cv?.skills);
      return {
        id: e.id,
        userId: e.userId,
        name: e.user.name,
        email: e.user.email,
        image: e.user.image,
        professionalTitle: e.user.cv?.professionalTitle ?? null,
        location: e.user.profile?.location ?? null,
        assessmentScore: a,
        interviewScore: iv,
        reason: e.reason,
        skillsMatched: labels,
        createdAt: e.createdAt.toISOString(),
        proctoringSuspendedUntil: e.user.proctoringSuspendedUntil?.toISOString() ?? null,
        proctoringCooldownActive: isProctoringSuspended(e.user.proctoringSuspendedUntil),
      };
    })
    .filter((r) => {
      if (f.minAssessment != null && (r.assessmentScore == null || r.assessmentScore < f.minAssessment)) return false;
      if (f.maxAssessment != null && (r.assessmentScore == null || r.assessmentScore > f.maxAssessment)) return false;
      if (f.minInterview != null && (r.interviewScore == null || r.interviewScore < f.minInterview)) return false;
      if (f.maxInterview != null && (r.interviewScore == null || r.interviewScore > f.maxInterview)) return false;
      if (skillNeedle) {
        const blob = `${(r.professionalTitle ?? "").toLowerCase()} ${r.skillsMatched.join(" ").toLowerCase()}`;
        if (!blob.includes(skillNeedle)) return false;
      }
      return true;
    });

  return NextResponse.json({ success: true, data: { items: rows } }, { status: 200 });
}
