import { NextResponse, type NextRequest } from "next/server";
import { ApplicationStatus, AssessmentStatus, InterviewStatus, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { sanitizeUserForEmployer } from "@/lib/sanitize-user";

const qpSchema = z.object({
  jobId: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
  sort: z.enum(["newest", "oldest", "match"]).optional().default("newest"),
  hasAssessment: z.enum(["true", "false"]).optional(),
  hasInterview: z.enum(["true", "false"]).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = qpSchema.safeParse({
    jobId: url.searchParams.get("jobId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    hasAssessment: url.searchParams.get("hasAssessment") ?? undefined,
    hasInterview: url.searchParams.get("hasInterview") ?? undefined,
    minScore: url.searchParams.get("minScore") ?? undefined,
    maxScore: url.searchParams.get("maxScore") ?? undefined,
  });

  const jobIdFilter = parsed.success ? parsed.data.jobId : undefined;
  const statusFilter = parsed.success ? parsed.data.status : undefined;
  const page = parsed.success ? parsed.data.page : 1;
  const pageSize = parsed.success ? parsed.data.pageSize : 10;
  const sort = parsed.success ? parsed.data.sort : "newest";
  const hasAssessment = parsed.success ? parsed.data.hasAssessment : undefined;
  const hasInterview = parsed.success ? parsed.data.hasInterview : undefined;
  const minScore = parsed.success ? parsed.data.minScore : undefined;
  const maxScore = parsed.success ? parsed.data.maxScore : undefined;

  const prisma = getPrisma();
  const employerId = session.user.id;

  const jobSeekerAnd: Prisma.UserWhereInput[] = [];
  if (hasAssessment === "true") {
    jobSeekerAnd.push({
      assessments: {
        some: {
          status: AssessmentStatus.COMPLETED,
        },
      },
    });
  }
  if (hasInterview === "true") {
    jobSeekerAnd.push({
      videoInterviews: {
        some: {
          status: InterviewStatus.COMPLETED,
        },
      },
    });
  }
  if (minScore != null || maxScore != null) {
    jobSeekerAnd.push({
      assessments: {
        some: {
          status: AssessmentStatus.COMPLETED,
          totalScore: {
            ...(minScore != null ? { gte: minScore } : {}),
            ...(maxScore != null ? { lte: maxScore } : {}),
          },
        },
      },
    });
  }

  const baseWhere: Prisma.ApplicationWhereInput = {
    job: { employerId },
    ...(jobIdFilter ? { jobId: jobIdFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(jobSeekerAnd.length ? { jobSeeker: { AND: jobSeekerAnd } } : {}),
  };

  const orderBy: Prisma.ApplicationOrderByWithRelationInput | Prisma.ApplicationOrderByWithRelationInput[] =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "match"
        ? [{ matchScore: "desc" }, { createdAt: "desc" }]
        : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    prisma.application.count({ where: baseWhere }),
    prisma.application.findMany({
      where: baseWhere,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        offerAcceptedAt: true,
        createdAt: true,
        matchScore: true,
        job: { select: { id: true, title: true } },
        jobSeeker: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            profile: { select: { bio: true, location: true, phone: true } },
            assessments: {
              where: { status: AssessmentStatus.COMPLETED },
              take: 1,
              select: { id: true, totalScore: true },
            },
            videoInterviews: {
              where: { status: InterviewStatus.COMPLETED },
              take: 1,
              select: { id: true, overallScore: true },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    success: true,
    data: {
      items: rows.map((r) => {
          const isHired =
            r.status === ApplicationStatus.HIRED || r.offerAcceptedAt != null;
          const candidate = sanitizeUserForEmployer(r.jobSeeker, isHired);
          return {
            id: r.id,
            status: r.status,
            matchScore: r.matchScore,
            createdAt: r.createdAt.toISOString(),
            jobId: r.job.id,
            jobTitle: r.job.title,
            candidate,
            candidateName: candidate.name,
            candidateEmail: candidate.email ?? "",
            contactHidden: !isHired,
            candidateImage: candidate.image,
            candidateId: candidate.id,
            hasSharedAssessment: r.jobSeeker.assessments.length > 0,
            hasSharedInterview: r.jobSeeker.videoInterviews.length > 0,
            sharedAssessmentScore: r.jobSeeker.assessments[0]?.totalScore ?? null,
          };
        }),
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}
