import { AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { isProctoringSuspended } from "@/lib/assessment/proctoring-policy";
import { resolveProctoringSuspendedUntil } from "@/lib/talent-pool/talent-pool-server";
import type { ApiResponse } from "@/types";

export type EmployerTalentPoolMemberDto = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  professionalTitle: string | null;
  assessmentScore: number | null;
  interviewScore: number | null;
  inPool: boolean;
  poolReason: string | null;
  poolEntryAt: string | null;
  proctoringSuspendedUntil: string | null;
  proctoringCooldownActive: boolean;
  profile: {
    bio: string | null;
    phone: string | null;
    location: string | null;
    nationality: string | null;
  } | null;
  cv: {
    fullName: string | null;
    professionalTitle: string | null;
    summary: string | null;
    experience: unknown;
    education: unknown;
    skills: unknown;
    languages: unknown;
    certifications: unknown;
    portfolioUrl: string | null;
    linkedinUrl: string | null;
  } | null;
  sharedAssessment: {
    totalScore: number | null;
    skillsScore: number | null;
    communicationScore: number | null;
    behavioralScore: number | null;
    industryFitScore: number | null;
    strengths: unknown;
    isFlagged: boolean;
  } | null;
};

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
): Promise<NextResponse<ApiResponse<EmployerTalentPoolMemberDto>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  const prisma = getPrisma();

  const entry = await prisma.talentPoolEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { reason: true, createdAt: true },
  });

  if (!entry) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const suspendedUntil = await resolveProctoringSuspendedUntil(userId);

  const user = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.JOBSEEKER },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profile: {
        select: {
          bio: true,
          phone: true,
          location: true,
          nationality: true,
        },
      },
      cv: {
        select: {
          fullName: true,
          professionalTitle: true,
          summary: true,
          experience: true,
          education: true,
          skills: true,
          languages: true,
          certifications: true,
          portfolioUrl: true,
          linkedinUrl: true,
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
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const sharedAssessment = await prisma.assessment.findFirst({
    where: {
      userId,
      shareWithEmployers: true,
      status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
    },
    orderBy: { completedAt: "desc" },
    select: {
      totalScore: true,
      skillsScore: true,
      communicationScore: true,
      behavioralScore: true,
      industryFitScore: true,
      strengths: true,
      isFlagged: true,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        professionalTitle: user.cv?.professionalTitle ?? null,
        assessmentScore: user.assessments[0]?.totalScore ?? null,
        interviewScore: user.videoInterviews[0]?.overallScore ?? null,
        inPool: true,
        poolReason: entry.reason,
        poolEntryAt: entry.createdAt.toISOString(),
        proctoringSuspendedUntil: suspendedUntil?.toISOString() ?? null,
        proctoringCooldownActive: isProctoringSuspended(suspendedUntil),
        profile: user.profile,
        cv: user.cv,
        sharedAssessment: sharedAssessment
          ? {
              totalScore: sharedAssessment.totalScore,
              skillsScore: sharedAssessment.skillsScore,
              communicationScore: sharedAssessment.communicationScore,
              behavioralScore: sharedAssessment.behavioralScore,
              industryFitScore: sharedAssessment.industryFitScore,
              strengths: sharedAssessment.strengths,
              isFlagged: sharedAssessment.isFlagged,
            }
          : null,
      },
    },
    { status: 200 },
  );
}
