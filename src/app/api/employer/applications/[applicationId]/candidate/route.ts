import { ApplicationStatus, AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, EmployerCandidatePayload, EmployerJdFitBriefing } from "@/types";
import { sanitizeUserForEmployer } from "@/lib/sanitize-user";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { NotificationType } from "@prisma/client";
import { analyzeJdFit, parseStoredFitAnalysis } from "@/lib/jobs/jd-fit-analysis";

export const maxDuration = 60;

function fitFromSnapshot(cvSnapshot: unknown): EmployerJdFitBriefing | null {
  if (!cvSnapshot || typeof cvSnapshot !== "object") return null;
  const raw = (cvSnapshot as { fitAnalysis?: unknown }).fitAnalysis;
  const parsed = parseStoredFitAnalysis(raw);
  if (!parsed) return null;
  return {
    fitScore: parsed.fitScore,
    summary: parsed.summary,
    summaryAr: parsed.summaryAr ?? "",
    strengths: parsed.strengths,
    strengthsAr: parsed.strengthsAr ?? [],
    gaps: parsed.gaps.map((g) => ({
      code: g.code,
      severity: g.severity,
      title: g.title,
      titleAr: g.titleAr || g.title,
      detail: g.detail,
      detailAr: g.detailAr || g.detail,
    })),
    analyzedAt: parsed.analyzedAt,
  };
}

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
      matchScore: true,
      cvSnapshot: true,
      job: {
        select: {
          id: true,
          title: true,
          description: true,
          requirements: true,
          skills: true,
          hiringMeta: true,
        },
      },
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

  let applicationStatus = row.status;

  /** Opening a candidate profile marks the application as Viewed (REVIEWED). */
  if (applicationStatus === ApplicationStatus.PENDING) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REVIEWED },
    });
    applicationStatus = ApplicationStatus.REVIEWED;

    await createUserNotification({
      userId: row.jobSeeker.id,
      type: NotificationType.APPLICATION_UPDATE,
      title: "Employer viewed your application",
      titleAr: "اطّلع صاحب العمل على طلبك",
      message: `Your application for ${row.job.title} was viewed by the employer.`,
      messageAr: `تمت مشاهدة طلبك لوظيفة ${row.job.title} من قبل صاحب العمل.`,
      link: `/dashboard/job-seeker/applications`,
    });
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

  const sharedInterview =
    (await prisma.videoInterview.findFirst({
      where: {
        userId: seekerId,
        jobId: row.job.id,
        interviewKind: "job",
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
        recordingData: true,
        recordingMimeType: true,
        jobId: true,
        interviewKind: true,
      },
    })) ??
    (await prisma.videoInterview.findFirst({
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
        recordingData: true,
        recordingMimeType: true,
        jobId: true,
        interviewKind: true,
      },
    }));

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
    applicationStatus === ApplicationStatus.HIRED || row.offerAcceptedAt != null;

  let jdFit = fitFromSnapshot(row.cvSnapshot);
  let matchScore = row.matchScore;

  if (!jdFit && row.jobSeeker.cv) {
    const analysis = await analyzeJdFit({
      job: {
        title: row.job.title,
        description: row.job.description,
        requirements: row.job.requirements,
        skills: row.job.skills,
        hiringMeta: row.job.hiringMeta,
      },
      cv: {
        professionalTitle: row.jobSeeker.cv.professionalTitle,
        summary: row.jobSeeker.cv.summary,
        experience: row.jobSeeker.cv.experience,
        education: row.jobSeeker.cv.education,
        skills: row.jobSeeker.cv.skills,
      },
    });
    jdFit = {
      fitScore: analysis.fitScore,
      summary: analysis.summary,
      summaryAr: analysis.summaryAr ?? "",
      strengths: analysis.strengths,
      strengthsAr: analysis.strengthsAr ?? [],
      gaps: analysis.gaps.map((g) => ({
        code: g.code,
        severity: g.severity,
        title: g.title,
        titleAr: g.titleAr || g.title,
        detail: g.detail,
        detailAr: g.detailAr || g.detail,
      })),
      analyzedAt: analysis.analyzedAt,
    };
    matchScore = analysis.fitScore;
    const prevSnap =
      row.cvSnapshot && typeof row.cvSnapshot === "object"
        ? (row.cvSnapshot as Record<string, unknown>)
        : {};
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        matchScore: analysis.fitScore,
        cvSnapshot: { ...prevSnap, fitAnalysis: analysis } as object,
      },
    });
  }

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
    applicationStatus,
    appliedForJobTitle: row.job.title,
    contactUnlocked,
    jdFit,
    matchScore,
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
          hasRecording: Boolean(sharedInterview.recordingData?.length),
          recordingKind: sharedInterview.recordingData?.length
            ? sharedInterview.recordingMimeType?.startsWith("video/")
              ? "video"
              : "audio"
            : null,
        }
      : null,
    proctoringSummary,
  };

  return NextResponse.json({ success: true, data: payload }, { status: 200 });
}
