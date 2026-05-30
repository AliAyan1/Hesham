import { ApplicationStatus, AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, EmployerCandidatePayload } from "@/types";
import { sanitizeUserForEmployer } from "@/lib/sanitize-user";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse<ApiResponse<EmployerCandidatePayload> | { success: false; error: string }>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await ctx.params;
  const prisma = getPrisma();

  const row = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { employerId: session.user.id },
    },
    select: {
      id: true,
      status: true,
      offerAcceptedAt: true,
      job: { select: { title: true } },
      jobSeeker: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
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
        },
      },
    },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const seekerId = row.jobSeeker.id;

  const sharedAssessment = await prisma.assessment.findFirst({
    where: {
      userId: seekerId,
      status: { in: [AssessmentStatus.COMPLETED, AssessmentStatus.FLAGGED] },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      totalScore: true,
      overallScore: true,
      thinkingStyleScore: true,
      behavioralScore: true,
      interestsScore: true,
      skillsScore: true,
      communicationScore: true,
      industryFitScore: true,
      strengths: true,
      weaknesses: true,
      writtenReport: true,
      topJobMatches: true,
      isFlagged: true,
    },
  });

  const sharedInterview = await prisma.videoInterview.findFirst({
    where: {
      userId: seekerId,
      status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      overallScore: true,
      communicationScore: true,
      confidenceScore: true,
      clarityScore: true,
      relevanceScore: true,
      transcripts: true,
      questions: true,
      aiAnalysis: true,
      strengths: true,
      improvements: true,
      recordingUrl: true,
      isFlagged: true,
    },
  });

  const procOr: Array<{ assessmentId?: string; interviewId?: string }> = [];
  if (sharedAssessment) procOr.push({ assessmentId: sharedAssessment.id });
  if (sharedInterview) procOr.push({ interviewId: sharedInterview.id });

  const sessions =
    procOr.length > 0
      ? await prisma.proctoringSession.findMany({
          where: {
            userId: seekerId,
            OR: procOr,
          },
          select: {
            isFlagged: true,
            tabSwitches: true,
            faceNotVisible: true,
            multipleFaces: true,
            copyPasteAttempts: true,
            aiToolDetected: true,
          },
        })
      : [];

  const proctoringSummary = sessions.reduce(
    (acc, s) => ({
      flagCount: acc.flagCount + (s.isFlagged ? 1 : 0),
      tabSwitches: acc.tabSwitches + s.tabSwitches,
      faceNotVisible: acc.faceNotVisible + s.faceNotVisible,
      multipleFaces: acc.multipleFaces + s.multipleFaces,
      copyPasteAttempts: acc.copyPasteAttempts + s.copyPasteAttempts,
      aiToolDetected: acc.aiToolDetected + s.aiToolDetected,
      sessionsFlagged: acc.sessionsFlagged + (s.isFlagged ? 1 : 0),
    }),
    {
      flagCount: 0,
      tabSwitches: 0,
      faceNotVisible: 0,
      multipleFaces: 0,
      copyPasteAttempts: 0,
      aiToolDetected: 0,
      sessionsFlagged: 0,
    },
  );

  const contactUnlocked =
    row.status === ApplicationStatus.HIRED || row.offerAcceptedAt != null;

  const publicCandidate = sanitizeUserForEmployer(row.jobSeeker, contactUnlocked);
  const maskedSeeker = {
    ...row.jobSeeker,
    email: publicCandidate.email ?? "",
    name: publicCandidate.name,
    image: publicCandidate.image,
    profile: row.jobSeeker.profile
      ? {
          ...row.jobSeeker.profile,
          phone: publicCandidate.phone ?? null,
          bio: publicCandidate.profile?.bio ?? row.jobSeeker.profile.bio,
          location: publicCandidate.profile?.location ?? row.jobSeeker.profile.location,
          skills: publicCandidate.profile?.skills ?? null,
        }
      : null,
    cv: contactUnlocked
      ? row.jobSeeker.cv
      : row.jobSeeker.cv
        ? {
            ...row.jobSeeker.cv,
            linkedinUrl: null as string | null,
            portfolioUrl: null as string | null,
          }
        : null,
  };

  const payload: EmployerCandidatePayload = {
    applicationId: row.id,
    applicationStatus: row.status,
    appliedForJobTitle: row.job.title,
    contactUnlocked,
    candidate: maskedSeeker,
    sharedAssessment: sharedAssessment
      ? {
          id: sharedAssessment.id,
          totalScore: sharedAssessment.totalScore ?? (sharedAssessment.overallScore != null ? Math.round(sharedAssessment.overallScore) : null),
          overallScore: sharedAssessment.overallScore ?? sharedAssessment.totalScore,
          thinkingStyleScore: sharedAssessment.thinkingStyleScore,
          behavioralScore: sharedAssessment.behavioralScore,
          interestsScore: sharedAssessment.interestsScore,
          skillsScore: sharedAssessment.skillsScore,
          communicationScore: sharedAssessment.communicationScore,
          industryFitScore: sharedAssessment.industryFitScore,
          strengths: sharedAssessment.strengths,
          weaknesses: sharedAssessment.weaknesses,
          writtenReport: sharedAssessment.writtenReport,
          topJobMatches: sharedAssessment.topJobMatches,
          isFlagged: sharedAssessment.isFlagged,
        }
      : null,
    sharedInterview: sharedInterview
      ? {
          id: sharedInterview.id,
          overallScore: sharedInterview.overallScore,
          communicationScore: sharedInterview.communicationScore,
          confidenceScore: sharedInterview.confidenceScore,
          clarityScore: sharedInterview.clarityScore,
          relevanceScore: sharedInterview.relevanceScore,
          transcripts: sharedInterview.transcripts,
          questions: sharedInterview.questions,
          aiAnalysis: sharedInterview.aiAnalysis,
          strengths: sharedInterview.strengths,
          improvements: sharedInterview.improvements,
          recordingUrl: sharedInterview.recordingUrl,
          isFlagged: sharedInterview.isFlagged,
          hasRecording:
            (await prisma.videoInterview.count({
              where: { id: sharedInterview.id, recordingData: { not: null } },
            })) > 0,
        }
      : null,
    proctoringSummary,
  };

  return NextResponse.json({ success: true, data: payload }, { status: 200 });
}
